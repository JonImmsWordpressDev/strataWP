<?php
/**
 * Analytics Component
 *
 * Sets a dev cookie for internal traffic exclusion in analytics platforms like GA4.
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Analytics Component
 *
 * Provides internal traffic exclusion via dev cookie.
 */
class Analytics implements ComponentInterface {

	/**
	 * Exclusion mode constants
	 */
	public const MODE_DISABLED  = 'disabled';
	public const MODE_ADMINS    = 'admins';
	public const MODE_LOGGED_IN = 'logged_in';

	/**
	 * Cookie name
	 */
	private const COOKIE_NAME = 'dev';

	/**
	 * Cookie expiry in seconds (1 hour)
	 */
	private const COOKIE_EXPIRY = 3600;

	/**
	 * Get component slug
	 *
	 * @return string
	 */
	public function get_slug(): string {
		return 'analytics';
	}

	/**
	 * Initialize component
	 *
	 * @return void
	 */
	public function initialize(): void {
		add_action( 'init', array( $this, 'set_dev_cookie' ) );
		add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	/**
	 * Get current exclusion mode
	 *
	 * @return string
	 */
	public function get_exclusion_mode(): string {
		$mode = get_option( 'stratawp_analytics_exclude_mode', self::MODE_DISABLED );
		return apply_filters( 'stratawp_analytics_exclude_mode', $mode );
	}

	/**
	 * Set dev cookie based on exclusion mode
	 *
	 * @return void
	 */
	public function set_dev_cookie(): void {
		$mode = $this->get_exclusion_mode();

		if ( self::MODE_DISABLED === $mode ) {
			return;
		}

		$should_set = false;

		if ( self::MODE_ADMINS === $mode && current_user_can( 'manage_options' ) ) {
			$should_set = true;
		} elseif ( self::MODE_LOGGED_IN === $mode && is_user_logged_in() ) {
			$should_set = true;
		}

		if ( $should_set && ! headers_sent() ) {
			setcookie(
				self::COOKIE_NAME,
				'true',
				time() + self::COOKIE_EXPIRY,
				'/',
				'',
				is_ssl(),
				false // Not HttpOnly - GA4 needs to read it
			);
		}
	}

	/**
	 * Register admin menu page
	 *
	 * @return void
	 */
	public function register_admin_menu(): void {
		add_options_page(
			__( 'StrataWP Analytics', 'stratawp' ),
			__( 'StrataWP Analytics', 'stratawp' ),
			'manage_options',
			'stratawp-analytics',
			array( $this, 'render_admin_page' )
		);
	}

	/**
	 * Register settings
	 *
	 * @return void
	 */
	public function register_settings(): void {
		register_setting(
			'stratawp_analytics',
			'stratawp_analytics_exclude_mode',
			array(
				'type'              => 'string',
				'default'           => self::MODE_DISABLED,
				'sanitize_callback' => array( $this, 'sanitize_exclusion_mode' ),
			)
		);
	}

	/**
	 * Sanitize exclusion mode
	 *
	 * @param string $value The value to sanitize.
	 * @return string
	 */
	public function sanitize_exclusion_mode( string $value ): string {
		$valid_modes = array( self::MODE_DISABLED, self::MODE_ADMINS, self::MODE_LOGGED_IN );
		return in_array( $value, $valid_modes, true ) ? $value : self::MODE_DISABLED;
	}

	/**
	 * Render admin page
	 *
	 * @return void
	 */
	public function render_admin_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$current_mode = $this->get_exclusion_mode();
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<form method="post" action="options.php">
				<?php
				settings_fields( 'stratawp_analytics' );
				do_settings_sections( 'stratawp_analytics' );
				?>

				<h2><?php esc_html_e( 'Internal Traffic Exclusion', 'stratawp' ); ?></h2>
				<p class="description">
					<?php esc_html_e( 'Set a "dev" cookie for internal users to exclude them from analytics tracking.', 'stratawp' ); ?>
				</p>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Who should be marked as internal traffic?', 'stratawp' ); ?></th>
						<td>
							<fieldset>
								<label>
									<input type="radio" name="stratawp_analytics_exclude_mode" value="<?php echo esc_attr( self::MODE_ADMINS ); ?>" <?php checked( $current_mode, self::MODE_ADMINS ); ?>>
									<strong><?php esc_html_e( 'Admins only', 'stratawp' ); ?></strong>
									<span class="description" style="display: block; margin-left: 25px;">
										<?php esc_html_e( 'Users with manage_options capability', 'stratawp' ); ?>
									</span>
								</label>
								<br><br>
								<label>
									<input type="radio" name="stratawp_analytics_exclude_mode" value="<?php echo esc_attr( self::MODE_LOGGED_IN ); ?>" <?php checked( $current_mode, self::MODE_LOGGED_IN ); ?>>
									<strong><?php esc_html_e( 'All logged-in users', 'stratawp' ); ?></strong>
									<span class="description" style="display: block; margin-left: 25px;">
										<?php esc_html_e( 'Any authenticated user', 'stratawp' ); ?>
									</span>
								</label>
								<br><br>
								<label>
									<input type="radio" name="stratawp_analytics_exclude_mode" value="<?php echo esc_attr( self::MODE_DISABLED ); ?>" <?php checked( $current_mode, self::MODE_DISABLED ); ?>>
									<strong><?php esc_html_e( 'Disabled', 'stratawp' ); ?></strong>
									<span class="description" style="display: block; margin-left: 25px;">
										<?php esc_html_e( 'No exclusion cookie set', 'stratawp' ); ?>
									</span>
								</label>
							</fieldset>
						</td>
					</tr>
				</table>

				<?php submit_button( __( 'Save Settings', 'stratawp' ) ); ?>
			</form>

			<hr>

			<h2><?php esc_html_e( 'How to use with GA4', 'stratawp' ); ?></h2>
			<ol>
				<li><?php esc_html_e( 'In GA4, go to Admin → Data Streams → Your Stream → Configure tag settings', 'stratawp' ); ?></li>
				<li><?php esc_html_e( 'Under "Define internal traffic", create a rule matching the "dev" cookie', 'stratawp' ); ?></li>
				<li><?php esc_html_e( 'Go to Admin → Data Settings → Data Filters and activate the internal traffic filter', 'stratawp' ); ?></li>
			</ol>
		</div>
		<?php
	}
}
