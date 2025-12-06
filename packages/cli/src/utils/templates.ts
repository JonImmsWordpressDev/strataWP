/**
 * Template generation utilities
 */

/**
 * Generate WordPress template HTML
 */
export function generateTemplateHTML(type: string, slug: string): string {
  const templates: Record<string, string> = {
    page: `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:post-title /-->
    <!-- wp:post-content /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,

    single: `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:post-title /-->

    <!-- wp:post-featured-image /-->

    <!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"}} -->
    <div class="wp-block-group">
        <!-- wp:post-date /-->
        <!-- wp:post-author /-->
    </div>
    <!-- /wp:group -->

    <!-- wp:post-content /-->

    <!-- wp:post-terms {"term":"category"} /-->
    <!-- wp:post-terms {"term":"post_tag"} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,

    archive: `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:query-title {"type":"archive"} /-->
    <!-- wp:term-description /-->

    <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true}} -->
    <div class="wp-block-query">
        <!-- wp:post-template -->
            <!-- wp:post-title {"isLink":true} /-->
            <!-- wp:post-excerpt /-->
            <!-- wp:post-date /-->
        <!-- /wp:post-template -->

        <!-- wp:query-pagination -->
            <!-- wp:query-pagination-previous /-->
            <!-- wp:query-pagination-numbers /-->
            <!-- wp:query-pagination-next /-->
        <!-- /wp:query-pagination -->
    </div>
    <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,

    '404': `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:heading {"level":1} -->
    <h1>404 - Page Not Found</h1>
    <!-- /wp:heading -->

    <!-- wp:paragraph -->
    <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
    <!-- /wp:paragraph -->

    <!-- wp:search {"label":"Search","showLabel":false,"placeholder":"Search..."} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,

    home: `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true}} -->
    <div class="wp-block-query">
        <!-- wp:post-template -->
            <!-- wp:post-featured-image {"isLink":true} /-->
            <!-- wp:post-title {"isLink":true} /-->
            <!-- wp:post-excerpt /-->
            <!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"}} -->
            <div class="wp-block-group">
                <!-- wp:post-date /-->
                <!-- wp:post-author /-->
            </div>
            <!-- /wp:group -->
        <!-- /wp:post-template -->

        <!-- wp:query-pagination -->
            <!-- wp:query-pagination-previous /-->
            <!-- wp:query-pagination-numbers /-->
            <!-- wp:query-pagination-next /-->
        <!-- /wp:query-pagination -->
    </div>
    <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,

    search: `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:query-title {"type":"search"} /-->

    <!-- wp:search {"label":"Search","showLabel":false} /-->

    <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true}} -->
    <div class="wp-block-query">
        <!-- wp:post-template -->
            <!-- wp:post-title {"isLink":true} /-->
            <!-- wp:post-excerpt /-->
        <!-- /wp:post-template -->

        <!-- wp:query-pagination -->
            <!-- wp:query-pagination-previous /-->
            <!-- wp:query-pagination-numbers /-->
            <!-- wp:query-pagination-next /-->
        <!-- /wp:query-pagination -->

        <!-- wp:query-no-results -->
            <!-- wp:paragraph -->
            <p>No results found. Try a different search.</p>
            <!-- /wp:paragraph -->
        <!-- /wp:query-no-results -->
    </div>
    <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,

    custom: `<!-- wp:template-part {"slug":"header","theme":"${slug}","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- Add your custom content here -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"${slug}","tagName":"footer"} /-->`,
  }

  return templates[type] || templates.custom
}

/**
 * Generate template part HTML
 */
export function generatePartHTML(type: string): string {
  const parts: Record<string, string> = {
    header: `<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between"}} -->
<div class="wp-block-group">
    <!-- wp:site-logo /-->
    <!-- wp:site-title /-->
    <!-- wp:navigation /-->
</div>
<!-- /wp:group -->`,

    footer: `<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
    <!-- wp:paragraph {"align":"center"} -->
    <p class="has-text-align-center">© <!-- wp:post-date {"format":"Y"} /--> All rights reserved.</p>
    <!-- /wp:paragraph -->

    <!-- wp:navigation {"layout":{"type":"flex","justifyContent":"center"}} /-->
</div>
<!-- /wp:group -->`,

    sidebar: `<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
    <!-- wp:heading -->
    <h2>Sidebar</h2>
    <!-- /wp:heading -->

    <!-- wp:search {"label":"Search","showLabel":false} /-->

    <!-- wp:latest-posts /-->

    <!-- wp:categories /-->
</div>
<!-- /wp:group -->`,

    content: `<!-- wp:post-title /-->
<!-- wp:post-content /-->`,

    custom: `<!-- wp:group {"layout":{"type":"default"}} -->
<div class="wp-block-group">
    <!-- Add your custom content here -->
</div>
<!-- /wp:group -->`,
  }

  return parts[type] || parts.custom
}

/**
 * Generate template part PHP
 */
export function generatePartPHP(type: string, slug: string): string {
  const parts: Record<string, string> = {
    header: `<?php
/**
 * Header Template Part
 *
 * @package ${slug}
 */
?>
<header class="site-header">
    <div class="site-branding">
        <?php
        if ( has_custom_logo() ) {
            the_custom_logo();
        }
        ?>
        <h1 class="site-title">
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
                <?php bloginfo( 'name' ); ?>
            </a>
        </h1>
        <?php
        $description = get_bloginfo( 'description', 'display' );
        if ( $description || is_customize_preview() ) :
            ?>
            <p class="site-description"><?php echo esc_html( $description ); ?></p>
        <?php endif; ?>
    </div>

    <nav class="main-navigation">
        <?php
        wp_nav_menu(
            array(
                'theme_location' => 'primary',
                'menu_class'     => 'primary-menu',
                'fallback_cb'    => false,
            )
        );
        ?>
    </nav>
</header>`,

    footer: `<?php
/**
 * Footer Template Part
 *
 * @package ${slug}
 */
?>
<footer class="site-footer">
    <div class="site-info">
        <p>&copy; <?php echo esc_html( date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?>. All rights reserved.</p>
    </div>

    <?php
    if ( has_nav_menu( 'footer' ) ) {
        wp_nav_menu(
            array(
                'theme_location' => 'footer',
                'menu_class'     => 'footer-menu',
                'depth'          => 1,
            )
        );
    }
    ?>
</footer>`,

    sidebar: `<?php
/**
 * Sidebar Template Part
 *
 * @package ${slug}
 */

if ( ! is_active_sidebar( 'sidebar-1' ) ) {
    return;
}
?>
<aside class="widget-area">
    <?php dynamic_sidebar( 'sidebar-1' ); ?>
</aside>`,

    content: `<?php
/**
 * Content Template Part
 *
 * @package ${slug}
 */
?>
<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <header class="entry-header">
        <?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
    </header>

    <div class="entry-content">
        <?php
        the_content();

        wp_link_pages(
            array(
                'before' => '<div class="page-links">' . esc_html__( 'Pages:', '${slug}' ),
                'after'  => '</div>',
            )
        );
        ?>
    </div>

    <footer class="entry-footer">
        <?php
        // Post meta, tags, etc.
        ?>
    </footer>
</article>`,

    custom: `<?php
/**
 * Custom Template Part
 *
 * @package ${slug}
 */
?>
<!-- Add your custom PHP code here -->`,
  }

  return parts[type] || parts.custom
}

/**
 * Generate PHP component class
 */
export function generateComponentClass(
  name: string,
  namespace: string,
  type: string
): string {
  return `<?php
/**
 * ${name} Component
 *
 * @package ${namespace}
 */

namespace ${namespace}\\Components;

use StrataWP\\ComponentInterface;

/**
 * Class ${name}
 */
class ${name} implements ComponentInterface {
    /**
     * Get component slug
     *
     * @return string
     */
    public function get_slug(): string {
        return '${name.toLowerCase()}';
    }

    /**
     * Initialize component
     *
     * @return void
     */
    public function initialize(): void {
        // Add your initialization code here
        add_action( 'init', array( $this, 'register' ) );
    }

    /**
     * Register component functionality
     *
     * @return void
     */
    public function register(): void {
        // Add your registration code here
    }
}
`
}
