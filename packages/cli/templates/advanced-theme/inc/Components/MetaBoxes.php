<?php
/**
 * Meta Boxes Component
 *
 * Adds custom meta boxes for custom post types.
 *
 * @package StrataAdvanced
 */

namespace StrataBasic\Components;

use StrataWP\ComponentInterface;

/**
 * Custom Meta Boxes Manager
 */
class MetaBoxes implements ComponentInterface {
    /**
     * {@inheritdoc}
     */
    public function get_slug(): string {
        return 'meta-boxes';
    }

    /**
     * {@inheritdoc}
     */
    public function initialize(): void {
        add_action( 'add_meta_boxes', [ $this, 'register_meta_boxes' ] );
        add_action( 'save_post', [ $this, 'save_meta_boxes' ], 10, 2 );
    }

    /**
     * Register all custom meta boxes
     */
    public function register_meta_boxes(): void {
        // Portfolio meta boxes
        add_meta_box(
            'portfolio_details',
            __( 'Project Details', 'strata-advanced' ),
            [ $this, 'render_portfolio_meta_box' ],
            'portfolio',
            'normal',
            'high'
        );

        // Team member meta boxes
        add_meta_box(
            'team_details',
            __( 'Member Details', 'strata-advanced' ),
            [ $this, 'render_team_meta_box' ],
            'team',
            'normal',
            'high'
        );

        // Testimonial meta boxes
        add_meta_box(
            'testimonial_details',
            __( 'Testimonial Details', 'strata-advanced' ),
            [ $this, 'render_testimonial_meta_box' ],
            'testimonial',
            'normal',
            'high'
        );

        // Case Study meta boxes
        add_meta_box(
            'case_study_details',
            __( 'Case Study Details', 'strata-advanced' ),
            [ $this, 'render_case_study_meta_box' ],
            'case_study',
            'normal',
            'high'
        );
    }

    /**
     * Render portfolio meta box
     *
     * @param \WP_Post $post Current post object.
     */
    public function render_portfolio_meta_box( $post ): void {
        wp_nonce_field( 'portfolio_meta_box', 'portfolio_meta_box_nonce' );

        $client = get_post_meta( $post->ID, '_portfolio_client', true );
        $url = get_post_meta( $post->ID, '_portfolio_url', true );
        $year = get_post_meta( $post->ID, '_portfolio_year', true );
        $role = get_post_meta( $post->ID, '_portfolio_role', true );
        ?>
        <div class="meta-box-fields">
            <p>
                <label for="portfolio_client"><?php esc_html_e( 'Client Name:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="portfolio_client" name="portfolio_client" value="<?php echo esc_attr( $client ); ?>" class="widefat">
            </p>

            <p>
                <label for="portfolio_url"><?php esc_html_e( 'Project URL:', 'strata-advanced' ); ?></label><br>
                <input type="url" id="portfolio_url" name="portfolio_url" value="<?php echo esc_url( $url ); ?>" class="widefat">
            </p>

            <p>
                <label for="portfolio_year"><?php esc_html_e( 'Year:', 'strata-advanced' ); ?></label><br>
                <input type="number" id="portfolio_year" name="portfolio_year" value="<?php echo esc_attr( $year ); ?>" min="1900" max="2100" step="1">
            </p>

            <p>
                <label for="portfolio_role"><?php esc_html_e( 'Your Role:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="portfolio_role" name="portfolio_role" value="<?php echo esc_attr( $role ); ?>" class="widefat">
            </p>
        </div>
        <?php
    }

    /**
     * Render team member meta box
     *
     * @param \WP_Post $post Current post object.
     */
    public function render_team_meta_box( $post ): void {
        wp_nonce_field( 'team_meta_box', 'team_meta_box_nonce' );

        $position = get_post_meta( $post->ID, '_team_position', true );
        $email = get_post_meta( $post->ID, '_team_email', true );
        $phone = get_post_meta( $post->ID, '_team_phone', true );
        $linkedin = get_post_meta( $post->ID, '_team_linkedin', true );
        $twitter = get_post_meta( $post->ID, '_team_twitter', true );
        ?>
        <div class="meta-box-fields">
            <p>
                <label for="team_position"><?php esc_html_e( 'Position/Title:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="team_position" name="team_position" value="<?php echo esc_attr( $position ); ?>" class="widefat">
            </p>

            <p>
                <label for="team_email"><?php esc_html_e( 'Email:', 'strata-advanced' ); ?></label><br>
                <input type="email" id="team_email" name="team_email" value="<?php echo esc_attr( $email ); ?>" class="widefat">
            </p>

            <p>
                <label for="team_phone"><?php esc_html_e( 'Phone:', 'strata-advanced' ); ?></label><br>
                <input type="tel" id="team_phone" name="team_phone" value="<?php echo esc_attr( $phone ); ?>" class="widefat">
            </p>

            <p>
                <label for="team_linkedin"><?php esc_html_e( 'LinkedIn URL:', 'strata-advanced' ); ?></label><br>
                <input type="url" id="team_linkedin" name="team_linkedin" value="<?php echo esc_url( $linkedin ); ?>" class="widefat">
            </p>

            <p>
                <label for="team_twitter"><?php esc_html_e( 'Twitter/X URL:', 'strata-advanced' ); ?></label><br>
                <input type="url" id="team_twitter" name="team_twitter" value="<?php echo esc_url( $twitter ); ?>" class="widefat">
            </p>
        </div>
        <?php
    }

    /**
     * Render testimonial meta box
     *
     * @param \WP_Post $post Current post object.
     */
    public function render_testimonial_meta_box( $post ): void {
        wp_nonce_field( 'testimonial_meta_box', 'testimonial_meta_box_nonce' );

        $author = get_post_meta( $post->ID, '_testimonial_author', true );
        $position = get_post_meta( $post->ID, '_testimonial_position', true );
        $company = get_post_meta( $post->ID, '_testimonial_company', true );
        $rating = get_post_meta( $post->ID, '_testimonial_rating', true );
        ?>
        <div class="meta-box-fields">
            <p>
                <label for="testimonial_author"><?php esc_html_e( 'Author Name:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="testimonial_author" name="testimonial_author" value="<?php echo esc_attr( $author ); ?>" class="widefat">
            </p>

            <p>
                <label for="testimonial_position"><?php esc_html_e( 'Position:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="testimonial_position" name="testimonial_position" value="<?php echo esc_attr( $position ); ?>" class="widefat">
            </p>

            <p>
                <label for="testimonial_company"><?php esc_html_e( 'Company:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="testimonial_company" name="testimonial_company" value="<?php echo esc_attr( $company ); ?>" class="widefat">
            </p>

            <p>
                <label for="testimonial_rating"><?php esc_html_e( 'Rating (1-5):', 'strata-advanced' ); ?></label><br>
                <input type="number" id="testimonial_rating" name="testimonial_rating" value="<?php echo esc_attr( $rating ); ?>" min="1" max="5" step="1">
            </p>
        </div>
        <?php
    }

    /**
     * Render case study meta box
     *
     * @param \WP_Post $post Current post object.
     */
    public function render_case_study_meta_box( $post ): void {
        wp_nonce_field( 'case_study_meta_box', 'case_study_meta_box_nonce' );

        $client = get_post_meta( $post->ID, '_case_study_client', true );
        $challenge = get_post_meta( $post->ID, '_case_study_challenge', true );
        $solution = get_post_meta( $post->ID, '_case_study_solution', true );
        $results = get_post_meta( $post->ID, '_case_study_results', true );
        $duration = get_post_meta( $post->ID, '_case_study_duration', true );
        ?>
        <div class="meta-box-fields">
            <p>
                <label for="case_study_client"><?php esc_html_e( 'Client:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="case_study_client" name="case_study_client" value="<?php echo esc_attr( $client ); ?>" class="widefat">
            </p>

            <p>
                <label for="case_study_challenge"><?php esc_html_e( 'Challenge:', 'strata-advanced' ); ?></label><br>
                <textarea id="case_study_challenge" name="case_study_challenge" rows="3" class="widefat"><?php echo esc_textarea( $challenge ); ?></textarea>
            </p>

            <p>
                <label for="case_study_solution"><?php esc_html_e( 'Solution:', 'strata-advanced' ); ?></label><br>
                <textarea id="case_study_solution" name="case_study_solution" rows="3" class="widefat"><?php echo esc_textarea( $solution ); ?></textarea>
            </p>

            <p>
                <label for="case_study_results"><?php esc_html_e( 'Results:', 'strata-advanced' ); ?></label><br>
                <textarea id="case_study_results" name="case_study_results" rows="3" class="widefat"><?php echo esc_textarea( $results ); ?></textarea>
            </p>

            <p>
                <label for="case_study_duration"><?php esc_html_e( 'Project Duration:', 'strata-advanced' ); ?></label><br>
                <input type="text" id="case_study_duration" name="case_study_duration" value="<?php echo esc_attr( $duration ); ?>" class="widefat" placeholder="e.g., 3 months">
            </p>
        </div>
        <?php
    }

    /**
     * Save meta box data
     *
     * @param int      $post_id Post ID.
     * @param \WP_Post $post    Post object.
     */
    public function save_meta_boxes( $post_id, $post ): void {
        // Check autosave
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }

        // Check permissions
        if ( ! current_user_can( 'edit_post', $post_id ) ) {
            return;
        }

        // Save based on post type
        switch ( $post->post_type ) {
            case 'portfolio':
                $this->save_portfolio_meta( $post_id );
                break;

            case 'team':
                $this->save_team_meta( $post_id );
                break;

            case 'testimonial':
                $this->save_testimonial_meta( $post_id );
                break;

            case 'case_study':
                $this->save_case_study_meta( $post_id );
                break;
        }
    }

    /**
     * Save portfolio meta data
     *
     * @param int $post_id Post ID.
     */
    private function save_portfolio_meta( $post_id ): void {
        if ( ! isset( $_POST['portfolio_meta_box_nonce'] ) || ! wp_verify_nonce( $_POST['portfolio_meta_box_nonce'], 'portfolio_meta_box' ) ) {
            return;
        }

        $fields = [ 'portfolio_client', 'portfolio_url', 'portfolio_year', 'portfolio_role' ];

        foreach ( $fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }
    }

    /**
     * Save team meta data
     *
     * @param int $post_id Post ID.
     */
    private function save_team_meta( $post_id ): void {
        if ( ! isset( $_POST['team_meta_box_nonce'] ) || ! wp_verify_nonce( $_POST['team_meta_box_nonce'], 'team_meta_box' ) ) {
            return;
        }

        $fields = [ 'team_position', 'team_email', 'team_phone', 'team_linkedin', 'team_twitter' ];

        foreach ( $fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }
    }

    /**
     * Save testimonial meta data
     *
     * @param int $post_id Post ID.
     */
    private function save_testimonial_meta( $post_id ): void {
        if ( ! isset( $_POST['testimonial_meta_box_nonce'] ) || ! wp_verify_nonce( $_POST['testimonial_meta_box_nonce'], 'testimonial_meta_box' ) ) {
            return;
        }

        $fields = [ 'testimonial_author', 'testimonial_position', 'testimonial_company', 'testimonial_rating' ];

        foreach ( $fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }
    }

    /**
     * Save case study meta data
     *
     * @param int $post_id Post ID.
     */
    private function save_case_study_meta( $post_id ): void {
        if ( ! isset( $_POST['case_study_meta_box_nonce'] ) || ! wp_verify_nonce( $_POST['case_study_meta_box_nonce'], 'case_study_meta_box' ) ) {
            return;
        }

        $text_fields = [ 'case_study_client', 'case_study_duration' ];
        $textarea_fields = [ 'case_study_challenge', 'case_study_solution', 'case_study_results' ];

        foreach ( $text_fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }

        foreach ( $textarea_fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_textarea_field( $_POST[ $field ] ) );
            }
        }
    }
}
