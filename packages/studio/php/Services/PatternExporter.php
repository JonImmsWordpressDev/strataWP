<?php
/**
 * Pattern Exporter Service
 *
 * @package StrataWP\Studio\Services
 */

namespace StrataWP\Studio\Services;

use StrataWP\Studio\PostTypes\PatternPostType;
use WP_Error;
use WP_Post;

/**
 * Service for exporting patterns to theme directory files.
 */
class PatternExporter {
    /**
     * Viewport width mappings.
     *
     * @var array<string, int>
     */
    private const VIEWPORT_WIDTHS = [
        'mobile'  => 375,
        'tablet'  => 768,
        'desktop' => 1200,
        'full'    => 1400,
    ];

    /**
     * Export a pattern to the theme's patterns directory.
     *
     * @param WP_Post $post The pattern post to export.
     * @return string|WP_Error Relative path on success, WP_Error on failure.
     */
    public function export( WP_Post $post ) {
        // Verify this is a pattern post type.
        if ( $post->post_type !== PatternPostType::POST_TYPE ) {
            return new WP_Error(
                'invalid_post_type',
                __( 'Post is not a pattern post type.', 'stratawp' )
            );
        }

        // Get patterns directory.
        $patterns_dir = get_stylesheet_directory() . '/patterns';

        // Create directory if it doesn't exist.
        if ( ! file_exists( $patterns_dir ) ) {
            if ( ! wp_mkdir_p( $patterns_dir ) ) {
                return new WP_Error(
                    'directory_creation_failed',
                    __( 'Failed to create patterns directory.', 'stratawp' )
                );
            }
        }

        // Check if directory is writable.
        if ( ! is_writable( $patterns_dir ) ) {
            return new WP_Error(
                'directory_not_writable',
                __( 'Patterns directory is not writable. Check file permissions.', 'stratawp' )
            );
        }

        // Generate filename from post slug.
        $filename = sanitize_file_name( $post->post_name ) . '.php';
        $filepath = $patterns_dir . '/' . $filename;

        // Get pattern metadata.
        $categories = $this->get_pattern_categories( $post );
        $keywords   = $this->get_pattern_keywords( $post );
        $viewport   = get_post_meta( $post->ID, '_stratawp_pattern_viewport', true );

        if ( empty( $viewport ) ) {
            $viewport = 'desktop';
        }

        // Generate pattern file content.
        $content = $this->generate_pattern_file( $post, $categories, $keywords, $viewport );

        // Write file.
        $result = file_put_contents( $filepath, $content );

        if ( $result === false ) {
            return new WP_Error(
                'file_write_failed',
                __( 'Failed to write pattern file.', 'stratawp' )
            );
        }

        // Return relative path.
        return 'patterns/' . $filename;
    }

    /**
     * Generate WordPress-compatible pattern file content.
     *
     * @param WP_Post $post       The pattern post.
     * @param array   $categories Array of category slugs.
     * @param array   $keywords   Array of keywords.
     * @param string  $viewport   Viewport name (mobile, tablet, desktop, full).
     * @return string The generated pattern file content.
     */
    public function generate_pattern_file( WP_Post $post, array $categories, array $keywords, string $viewport ): string {
        $theme_slug      = get_stylesheet();
        $pattern_slug    = $post->post_name;
        $title           = $post->post_title;
        $content         = $post->post_content;
        $viewport_width  = $this->get_viewport_width( $viewport );

        // Build header lines.
        $header_lines = [
            '<?php',
            '/**',
            ' * Title: ' . $title,
            ' * Slug: ' . $theme_slug . '/' . $pattern_slug,
        ];

        // Add categories if present.
        if ( ! empty( $categories ) ) {
            $header_lines[] = ' * Categories: ' . implode( ', ', $categories );
        }

        // Add keywords if present.
        if ( ! empty( $keywords ) ) {
            $header_lines[] = ' * Keywords: ' . implode( ', ', $keywords );
        }

        // Add viewport width only if not 'full'.
        if ( $viewport !== 'full' ) {
            $header_lines[] = ' * Viewport Width: ' . $viewport_width;
        }

        $header_lines[] = ' */';
        $header_lines[] = '?>';

        // Combine header and content.
        return implode( "\n", $header_lines ) . "\n" . $content;
    }

    /**
     * Get viewport width from viewport name.
     *
     * @param string $viewport Viewport name (mobile, tablet, desktop, full).
     * @return int Viewport width in pixels.
     */
    public function get_viewport_width( string $viewport ): int {
        return self::VIEWPORT_WIDTHS[ $viewport ] ?? self::VIEWPORT_WIDTHS['full'];
    }

    /**
     * Delete an exported pattern file.
     *
     * @param string $export_path Relative path to the exported file (e.g., 'patterns/my-pattern.php').
     * @return bool True if file was deleted or doesn't exist.
     */
    public function delete_export( string $export_path ): bool {
        $full_path = get_stylesheet_directory() . '/' . $export_path;

        // Return true if file doesn't exist.
        if ( ! file_exists( $full_path ) ) {
            return true;
        }

        // Attempt to delete the file.
        return wp_delete_file( $full_path ) || ! file_exists( $full_path );
    }

    /**
     * Get pattern categories as an array of slugs.
     *
     * @param WP_Post $post The pattern post.
     * @return array Array of category slugs.
     */
    private function get_pattern_categories( WP_Post $post ): array {
        $terms = get_the_terms( $post->ID, PatternPostType::TAXONOMY_CATEGORY );

        if ( is_wp_error( $terms ) || empty( $terms ) ) {
            return [];
        }

        return array_map(
            function ( $term ) {
                return $term->slug;
            },
            $terms
        );
    }

    /**
     * Get pattern keywords from post meta.
     *
     * @param WP_Post $post The pattern post.
     * @return array Array of keywords.
     */
    private function get_pattern_keywords( WP_Post $post ): array {
        $keywords = get_post_meta( $post->ID, '_stratawp_pattern_keywords', true );

        if ( ! is_array( $keywords ) ) {
            return [];
        }

        return $keywords;
    }
}
