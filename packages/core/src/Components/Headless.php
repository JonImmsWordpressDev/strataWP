<?php
/**
 * Headless Component
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Exposes each post's parsed block tree as a read-only `blocks` REST field,
 * so a decoupled frontend can render blocks as its own components.
 *
 * Opt-in: not part of the default component list.
 *
 * The field is added to items the REST controller already returns, so it
 * inherits the existing read permissions (drafts and private posts stay
 * behind authentication). Password-protected posts return an empty list
 * until the password is supplied, matching `content.rendered`.
 *
 * With a frontend URL and a shared secret it also points the editor's
 * Preview button at the frontend (a short-lived signed token) and sends a
 * signed webhook to the frontend when content is published, updated,
 * unpublished or trashed, so a cached frontend can revalidate.
 */
class Headless implements ComponentInterface {
	/**
	 * REST field name.
	 */
	public const FIELD = 'blocks';

	/**
	 * Webhook signature header.
	 */
	public const SIGNATURE_HEADER = 'X-StrataWP-Signature';

	/**
	 * Frontend base URL (no trailing slash), or '' when not configured.
	 *
	 * @var string
	 */
	protected string $frontend_url;

	/**
	 * Secret shared with the frontend for preview tokens and webhooks.
	 *
	 * @var string
	 */
	protected string $secret;

	/**
	 * Constructor.
	 *
	 * Both values fall back to the `STRATAWP_HEADLESS_FRONTEND_URL` and
	 * `STRATAWP_HEADLESS_SECRET` constants, so the secret can live in
	 * wp-config.php instead of the theme. Preview links and webhooks stay off
	 * until both are set.
	 *
	 * @param string $frontend_url Frontend base URL, e.g. https://www.example.com.
	 * @param string $secret       Shared secret.
	 */
	public function __construct( string $frontend_url = '', string $secret = '' ) {
		if ( '' === $frontend_url && defined( 'STRATAWP_HEADLESS_FRONTEND_URL' ) ) {
			$frontend_url = (string) constant( 'STRATAWP_HEADLESS_FRONTEND_URL' );
		}
		if ( '' === $secret && defined( 'STRATAWP_HEADLESS_SECRET' ) ) {
			$secret = (string) constant( 'STRATAWP_HEADLESS_SECRET' );
		}

		$this->frontend_url = rtrim( $frontend_url, '/' );
		$this->secret       = $secret;
	}

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'headless';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'rest_api_init', array( $this, 'register_rest_field' ) );

		if ( $this->is_connected() ) {
			add_filter( 'preview_post_link', array( $this, 'filter_preview_link' ), 10, 2 );
			add_action( 'transition_post_status', array( $this, 'on_transition' ), 10, 3 );
		}
	}

	/**
	 * Whether a frontend URL and a secret are configured.
	 *
	 * @return bool
	 */
	public function is_connected(): bool {
		return '' !== $this->frontend_url && '' !== $this->secret;
	}

	/**
	 * Register the `blocks` field on every REST-enabled content type.
	 */
	public function register_rest_field(): void {
		register_rest_field(
			$this->get_post_types(),
			self::FIELD,
			array(
				'get_callback' => array( $this, 'get_blocks_field' ),
				'schema'       => array(
					'description' => 'Parsed blocks with attributes, inner blocks and rendered HTML.',
					'type'        => 'array',
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'items'       => array( 'type' => 'object' ),
				),
			)
		);
	}

	/**
	 * Post types that get the field: REST-enabled, excluding attachments and
	 * WordPress's internal `wp_*` types (templates, reusable blocks, navigation).
	 *
	 * @return string[]
	 */
	public function get_post_types(): array {
		$types = array_values(
			array_filter(
				get_post_types( array( 'show_in_rest' => true ), 'names' ),
				static function ( $type ) {
					return 'attachment' !== $type && 0 !== strpos( $type, 'wp_' );
				}
			)
		);

		/**
		 * Filter the post types that expose the `blocks` REST field.
		 *
		 * @param string[] $types Post type names.
		 */
		return (array) apply_filters( 'stratawp_headless_post_types', $types );
	}

	/**
	 * REST get_callback for the `blocks` field.
	 *
	 * @param array $post Prepared post data (has `id`).
	 * @return array
	 */
	public function get_blocks_field( $post ): array {
		$post_id = isset( $post['id'] ) ? (int) $post['id'] : 0;
		if ( $post_id <= 0 || post_password_required( $post_id ) ) {
			return array();
		}

		$content = (string) get_post_field( 'post_content', $post_id );
		if ( '' === $content ) {
			return array();
		}

		return $this->format_blocks( parse_blocks( $content ) );
	}

	/**
	 * Turn a `parse_blocks()` tree into the public field shape.
	 *
	 * Whitespace between blocks (null-named blocks with no content) is dropped;
	 * classic content becomes `core/freeform`, as in the editor.
	 *
	 * @param array $blocks Parsed blocks.
	 * @return array
	 */
	public function format_blocks( array $blocks ): array {
		$output = array();

		foreach ( $blocks as $block ) {
			$name = isset( $block['blockName'] ) ? $block['blockName'] : null;

			if ( null === $name ) {
				if ( '' === trim( (string) ( $block['innerHTML'] ?? '' ) ) ) {
					continue;
				}
				$name = 'core/freeform';
			}

			$attributes = $this->with_defaults( $name, (array) ( $block['attrs'] ?? array() ) );

			/**
			 * Filter a block's attributes before they are exposed over REST.
			 * Return the array without any attribute that should stay private.
			 *
			 * @param array  $attributes Attributes with registered defaults applied.
			 * @param string $name       Block name.
			 * @param array  $block      The parsed block.
			 */
			$attributes = (array) apply_filters( 'stratawp_headless_block_attributes', $attributes, $name, $block );

			$output[] = array(
				'name'        => $name,
				'attributes'  => (object) $attributes,
				'innerBlocks' => $this->format_blocks( (array) ( $block['innerBlocks'] ?? array() ) ),
				'rendered'    => render_block( $block ),
			);
		}

		return $output;
	}

	/**
	 * Fill in attribute defaults from the registered block type, the same
	 * values the block's render callback would see.
	 *
	 * @param string $name       Block name.
	 * @param array  $attributes Attributes from the block comment.
	 * @return array
	 */
	public function with_defaults( string $name, array $attributes ): array {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type || ! is_array( $type->attributes ) ) {
			return $attributes;
		}

		foreach ( $type->attributes as $key => $schema ) {
			if ( ! array_key_exists( $key, $attributes ) && is_array( $schema ) && array_key_exists( 'default', $schema ) ) {
				$attributes[ $key ] = $schema['default'];
			}
		}

		return $attributes;
	}

	/**
	 * Point the editor's Preview link at the frontend's draft route.
	 *
	 * @param string   $link Default preview link.
	 * @param \WP_Post $post Post being previewed.
	 * @return string
	 */
	public function filter_preview_link( $link, $post ) {
		if ( ! $post instanceof \WP_Post || ! in_array( $post->post_type, $this->get_post_types(), true ) ) {
			return $link;
		}

		/**
		 * Filter how long a preview token stays valid, in seconds.
		 *
		 * @param int $ttl Lifetime in seconds.
		 */
		$ttl = max( 1, (int) apply_filters( 'stratawp_headless_preview_ttl', 5 * MINUTE_IN_SECONDS ) );

		$token = $this->sign_token(
			array(
				'id'   => (int) $post->ID,
				'type' => $post->post_type,
				'path' => $this->public_path( $post ),
				'exp'  => time() + $ttl,
			)
		);

		return $this->frontend_endpoint( 'preview', '/api/draft' ) . '?token=' . rawurlencode( $token );
	}

	/**
	 * Notify the frontend when content enters or leaves the published state.
	 *
	 * @param string   $new_status New status.
	 * @param string   $old_status Previous status.
	 * @param \WP_Post $post       The post.
	 */
	public function on_transition( $new_status, $old_status, $post ): void {
		if ( ! $post instanceof \WP_Post || wp_is_post_revision( $post ) || wp_is_post_autosave( $post ) ) {
			return;
		}

		if ( ! in_array( $post->post_type, $this->get_post_types(), true ) ) {
			return;
		}

		$event = self::transition_event( (string) $new_status, (string) $old_status );
		if ( null === $event ) {
			return;
		}

		$this->send_webhook( $this->webhook_payload( $event, $post ) );
	}

	/**
	 * Map a status change to a webhook event, or null when the public site
	 * does not change (drafts saved, scheduled, and so on).
	 *
	 * @param string $new_status New status.
	 * @param string $old_status Previous status.
	 * @return string|null One of publish, update, unpublish, trash.
	 */
	public static function transition_event( string $new_status, string $old_status ): ?string {
		if ( 'publish' === $new_status ) {
			return 'publish' === $old_status ? 'update' : 'publish';
		}

		if ( 'publish' !== $old_status ) {
			return null;
		}

		return 'trash' === $new_status ? 'trash' : 'unpublish';
	}

	/**
	 * Webhook body for one event.
	 *
	 * @param string   $event Event name.
	 * @param \WP_Post $post  The post.
	 * @return array
	 */
	public function webhook_payload( string $event, \WP_Post $post ): array {
		$payload = array(
			'event'     => $event,
			'id'        => (int) $post->ID,
			'type'      => $post->post_type,
			'slug'      => self::public_slug( $post ),
			'path'      => $this->public_path( $post ),
			'timestamp' => time(),
		);

		/**
		 * Filter the revalidation webhook body before it is signed and sent.
		 *
		 * @param array    $payload Event, id, type, slug, path and timestamp.
		 * @param \WP_Post $post    The post.
		 */
		return (array) apply_filters( 'stratawp_headless_webhook_payload', $payload, $post );
	}

	/**
	 * POST a signed JSON payload to the frontend's revalidate route.
	 *
	 * Non-blocking, so a slow or offline frontend never holds up saving.
	 *
	 * @param array $payload Webhook body.
	 */
	public function send_webhook( array $payload ): void {
		$body = (string) wp_json_encode( $payload );

		wp_remote_post(
			$this->frontend_endpoint( 'revalidate', '/api/revalidate' ),
			array(
				'body'     => $body,
				'headers'  => array(
					'Content-Type'         => 'application/json',
					self::SIGNATURE_HEADER => $this->sign_body( $body ),
				),
				'timeout'  => 5,
				'blocking' => false,
			)
		);
	}

	/**
	 * Signature header value for a webhook body: `sha256=<hex HMAC>`.
	 *
	 * @param string $body Raw request body.
	 * @return string
	 */
	public function sign_body( string $body ): string {
		return 'sha256=' . hash_hmac( 'sha256', $body, $this->secret );
	}

	/**
	 * Sign a preview token: base64url(JSON payload) . '.' . base64url(HMAC-SHA256).
	 *
	 * @param array $payload Token claims.
	 * @return string
	 */
	public function sign_token( array $payload ): string {
		$encoded = self::base64url( (string) wp_json_encode( $payload ) );

		return $encoded . '.' . self::base64url( hash_hmac( 'sha256', $encoded, $this->secret, true ) );
	}

	/**
	 * Verify a preview token and return its claims, or null when the
	 * signature does not match or the token has expired.
	 *
	 * @param string   $token Token from sign_token().
	 * @param int|null $now   Current time, for tests.
	 * @return array|null
	 */
	public function verify_token( string $token, ?int $now = null ): ?array {
		$parts = explode( '.', $token );
		if ( 2 !== count( $parts ) ) {
			return null;
		}

		$expected = self::base64url( hash_hmac( 'sha256', $parts[0], $this->secret, true ) );
		if ( ! hash_equals( $expected, $parts[1] ) ) {
			return null;
		}

		$json   = base64_decode( strtr( $parts[0], '-_', '+/' ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- token decoding, not obfuscation.
		$claims = false === $json ? null : json_decode( $json, true );
		if ( ! is_array( $claims ) || ! isset( $claims['exp'] ) || (int) $claims['exp'] < ( $now ?? time() ) ) {
			return null;
		}

		return $claims;
	}

	/**
	 * Path the post has (or will have) on the public site, even while it is a
	 * draft or after it was trashed, e.g. `/hello-world/`.
	 *
	 * @param \WP_Post $post The post.
	 * @return string
	 */
	public function public_path( \WP_Post $post ): string {
		$public              = clone $post;
		$public->post_status = 'publish';
		$public->post_name   = self::public_slug( $post );

		$path = wp_make_link_relative( (string) get_permalink( $public ) );

		return '' === $path ? '/' : $path;
	}

	/**
	 * The post's slug without WordPress's `__trashed` suffix, or one derived
	 * from the title for a draft that has no slug yet.
	 *
	 * @param \WP_Post $post The post.
	 * @return string
	 */
	public static function public_slug( \WP_Post $post ): string {
		$slug = preg_replace( '/__trashed(-\d+)?$/', '', (string) $post->post_name );

		return '' !== $slug ? $slug : sanitize_title( (string) $post->post_title );
	}

	/**
	 * Absolute URL of a frontend route.
	 *
	 * @param string $name         Route name (`preview` or `revalidate`), used in the filter name.
	 * @param string $default_path Default path.
	 * @return string
	 */
	protected function frontend_endpoint( string $name, string $default_path ): string {
		/**
		 * Filter the frontend path for the draft-mode route (`stratawp_headless_preview_path`,
		 * default `/api/draft`) or the revalidation webhook (`stratawp_headless_revalidate_path`,
		 * default `/api/revalidate`).
		 *
		 * @param string $path Path on the frontend.
		 */
		$path = (string) apply_filters( "stratawp_headless_{$name}_path", $default_path );

		return $this->frontend_url . '/' . ltrim( $path, '/' );
	}

	/**
	 * URL-safe base64 without padding.
	 *
	 * @param string $data Raw bytes.
	 * @return string
	 */
	protected static function base64url( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- token encoding, not obfuscation.
	}
}
