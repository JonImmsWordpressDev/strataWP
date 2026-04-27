<?php
/**
 * Updates Component
 *
 * Checks a GitHub repository for new releases and integrates with
 * WordPress's built-in theme update system. When a newer version
 * is found, WordPress displays an update notification in the dashboard
 * and provides one-click update via the standard updater.
 *
 * Usage:
 *   $updates = new Updates( 'JonImmsWordpressDev/strataWP' );
 *   // or override the zip asset name:
 *   $updates = new Updates( 'owner/repo', 'my-theme.zip' );
 *
 * The component expects GitHub Releases to:
 *   1. Use semantic version tags (e.g., v1.0.0 or 1.0.0)
 *   2. Attach a built theme .zip as a release asset
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * GitHub-based theme update checker
 */
class Updates implements ComponentInterface {
	/**
	 * GitHub repository (owner/repo)
	 *
	 * @var string
	 */
	protected string $repository;

	/**
	 * Expected zip asset name in GitHub releases
	 *
	 * @var string
	 */
	protected string $zip_asset_name;

	/**
	 * Cache key for GitHub release data
	 *
	 * @var string
	 */
	protected string $cache_key = 'stratawp_github_release';

	/**
	 * Cache TTL in seconds (6 hours)
	 *
	 * @var int
	 */
	protected int $cache_ttl = 6 * HOUR_IN_SECONDS;

	/**
	 * Constructor
	 *
	 * @param string $repository    GitHub repository in "owner/repo" format.
	 * @param string $zip_asset_name Expected zip filename in release assets.
	 */
	public function __construct( string $repository = '', string $zip_asset_name = '' ) {
		$this->repository     = $repository;
		$this->zip_asset_name = $zip_asset_name;
	}

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'updates';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		if ( empty( $this->repository ) ) {
			return;
		}

		add_filter( 'pre_set_site_transient_update_themes', [ $this, 'check_for_update' ] );
		add_filter( 'themes_api', [ $this, 'theme_info' ], 10, 3 );
		add_action( 'admin_notices', [ $this, 'show_update_notice' ] );
		add_filter( 'upgrader_pre_download', [ $this, 'authenticated_download' ], 10, 3 );
	}

	/**
	 * Check GitHub for a newer release
	 *
	 * Hooks into WordPress theme update check. If a newer version
	 * exists on GitHub, injects it into the update transient so
	 * WordPress shows the standard "Update available" UI.
	 *
	 * @param object $transient Theme update transient.
	 * @return object
	 */
	public function check_for_update( object $transient ): object {
		if ( empty( $transient->checked ) ) {
			return $transient;
		}

		$release = $this->get_latest_release();

		if ( ! $release ) {
			return $transient;
		}

		$theme_slug    = get_template();
		$current_version = wp_get_theme()->get( 'Version' );
		$remote_version  = $release['version'];

		if ( version_compare( $remote_version, $current_version, '>' ) ) {
			$transient->response[ $theme_slug ] = [
				'theme'       => $theme_slug,
				'new_version' => $remote_version,
				'url'         => $release['html_url'],
				'package'     => $release['zip_url'],
			];
		}

		return $transient;
	}

	/**
	 * Provide theme info for the WordPress update details modal
	 *
	 * @param false|object|array $result Result from themes_api.
	 * @param string             $action API action.
	 * @param object             $args   API arguments.
	 * @return false|object
	 */
	public function theme_info( $result, string $action, object $args ) {
		if ( 'theme_information' !== $action ) {
			return $result;
		}

		$theme_slug = get_template();

		if ( ! isset( $args->slug ) || $args->slug !== $theme_slug ) {
			return $result;
		}

		$release = $this->get_latest_release();

		if ( ! $release ) {
			return $result;
		}

		$theme = wp_get_theme();

		return (object) [
			'name'          => $theme->get( 'Name' ),
			'slug'          => $theme_slug,
			'version'       => $release['version'],
			'author'        => $theme->get( 'Author' ),
			'homepage'      => $theme->get( 'ThemeURI' ),
			'download_link' => $release['zip_url'],
			'sections'      => [
				'description' => $theme->get( 'Description' ),
				'changelog'   => $release['body'],
			],
		];
	}

	/**
	 * Show an admin notice when an update is available
	 *
	 * Only displays on the themes page for users who can update themes.
	 */
	public function show_update_notice(): void {
		if ( ! current_user_can( 'update_themes' ) ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen || 'themes' !== $screen->id ) {
			return;
		}

		$release = $this->get_latest_release();

		if ( ! $release ) {
			return;
		}

		$current_version = wp_get_theme()->get( 'Version' );

		if ( ! version_compare( $release['version'], $current_version, '>' ) ) {
			return;
		}

		$update_url = wp_nonce_url(
			admin_url( 'update.php?action=upgrade-theme&theme=' . get_template() ),
			'upgrade-theme_' . get_template()
		);

		printf(
			'<div class="notice notice-warning is-dismissible"><p>%s <a href="%s" class="button button-primary" style="margin-left: 10px;">%s</a></p></div>',
			sprintf(
				/* translators: 1: theme name, 2: new version number */
				esc_html__( 'A new version of %1$s is available (%2$s).', 'stratawp' ),
				'<strong>' . esc_html( wp_get_theme()->get( 'Name' ) ) . '</strong>',
				esc_html( $release['version'] )
			),
			esc_url( $update_url ),
			esc_html__( 'Update Now', 'stratawp' )
		);
	}

	/**
	 * Make an authenticated GET request to the GitHub API
	 *
	 * Uses PHP curl directly to avoid WordPress filters and hosting
	 * security plugins that strip Authorization headers from
	 * wp_remote_get requests.
	 *
	 * @param string $url GitHub API URL.
	 * @return array|null Decoded JSON response or null on failure.
	 */
	protected function github_api_get( string $url ): ?array {
		$headers = [
			'Accept: application/vnd.github.v3+json',
			'User-Agent: StrataWP-Update-Checker',
		];

		$token = defined( 'STRATAWP_GITHUB_TOKEN' ) ? STRATAWP_GITHUB_TOKEN : '';
		if ( ! empty( $token ) ) {
			$headers[] = 'Authorization: Bearer ' . $token;
		}

		$ch = curl_init( $url );
		curl_setopt_array( $ch, [
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HTTPHEADER     => $headers,
			CURLOPT_TIMEOUT        => 10,
			CURLOPT_FOLLOWLOCATION => true,
		] );

		$body = curl_exec( $ch );
		$code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
		curl_close( $ch );

		if ( 200 !== $code || empty( $body ) ) {
			return null;
		}

		return json_decode( $body, true );
	}

	/**
	 * Download the theme zip with authentication
	 *
	 * Intercepts WordPress's download for our GitHub repo and uses
	 * curl directly, since some hosts strip Authorization headers
	 * from wp_remote_get requests.
	 *
	 * @param bool|WP_Error $reply    Whether to short-circuit.
	 * @param string        $package  The package URL.
	 * @param \WP_Upgrader  $upgrader The upgrader instance.
	 * @return bool|string|\WP_Error
	 */
	public function authenticated_download( $reply, string $package, $upgrader ) {
		if ( ! str_contains( $package, 'api.github.com/repos/' . $this->repository ) ) {
			return $reply;
		}

		$token = defined( 'STRATAWP_GITHUB_TOKEN' ) ? STRATAWP_GITHUB_TOKEN : '';
		if ( empty( $token ) ) {
			return $reply;
		}

		$tmpfile = wp_tempnam( 'stratawp-update' );

		$headers = [
			'Accept: application/octet-stream',
			'User-Agent: StrataWP-Update-Checker',
			'Authorization: Bearer ' . $token,
		];

		$ch = curl_init( $package );
		$fp = fopen( $tmpfile, 'wb' );

		curl_setopt_array( $ch, [
			CURLOPT_FILE           => $fp,
			CURLOPT_HTTPHEADER     => $headers,
			CURLOPT_TIMEOUT        => 300,
			CURLOPT_FOLLOWLOCATION => true,
		] );

		curl_exec( $ch );
		$code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
		curl_close( $ch );
		fclose( $fp );

		if ( 200 !== $code ) {
			unlink( $tmpfile );
			return new \WP_Error(
				'download_failed',
				sprintf( 'GitHub download failed (HTTP %d).', $code )
			);
		}

		return $tmpfile;
	}

	/**
	 * Get the latest release from GitHub
	 *
	 * Results are cached for 6 hours to avoid hitting the GitHub API
	 * rate limit on every admin page load.
	 *
	 * @return array{version: string, html_url: string, zip_url: string, body: string}|null
	 */
	protected function get_latest_release(): ?array {
		$cached = get_transient( $this->cache_key );

		if ( false !== $cached ) {
			return $cached ?: null;
		}

		$url = sprintf(
			'https://api.github.com/repos/%s/releases/latest',
			$this->repository
		);

		$data = $this->github_api_get( $url );

		if ( ! $data ) {
			set_transient( $this->cache_key, '', $this->cache_ttl );
			return null;
		}

		if ( empty( $data['tag_name'] ) ) {
			set_transient( $this->cache_key, '', $this->cache_ttl );
			return null;
		}

		// Strip leading 'v' from tag (v1.0.0 -> 1.0.0)
		$version = ltrim( $data['tag_name'], 'v' );

		// Find the zip asset in release assets
		$zip_url = $this->find_zip_asset( $data['assets'] ?? [] );

		// Fall back to GitHub's auto-generated zipball
		if ( ! $zip_url ) {
			$zip_url = $data['zipball_url'] ?? '';
		}

		if ( empty( $zip_url ) ) {
			set_transient( $this->cache_key, '', $this->cache_ttl );
			return null;
		}

		$release = [
			'version'  => $version,
			'html_url' => $data['html_url'] ?? '',
			'zip_url'  => $zip_url,
			'body'     => $data['body'] ?? '',
		];

		set_transient( $this->cache_key, $release, $this->cache_ttl );

		return $release;
	}

	/**
	 * Find the theme zip in release assets
	 *
	 * Looks for a .zip file matching the configured asset name,
	 * or falls back to any .zip asset.
	 *
	 * @param array $assets GitHub release assets.
	 * @return string|null Download URL or null.
	 */
	protected function find_zip_asset( array $assets ): ?string {
		if ( empty( $assets ) ) {
			return null;
		}

		// If a specific asset name was configured, look for it
		if ( ! empty( $this->zip_asset_name ) ) {
			foreach ( $assets as $asset ) {
				if ( $asset['name'] === $this->zip_asset_name ) {
					return $asset['url'] ?? null;
				}
			}
		}

		// Fall back to any .zip asset
		foreach ( $assets as $asset ) {
			if ( str_ends_with( $asset['name'] ?? '', '.zip' ) ) {
				return $asset['url'] ?? null;
			}
		}

		return null;
	}
}
