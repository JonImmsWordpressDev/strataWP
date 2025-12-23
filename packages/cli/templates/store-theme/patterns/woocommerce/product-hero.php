<?php
/**
 * Title: Product Hero Section
 * Slug: strata-store/product-hero
 * Categories: woocommerce
 * Description: Hero section for e-commerce with CTA
 */
?>

<!-- wp:cover {"url":"<?php echo esc_url( get_template_directory_uri() . '/screenshot.png' ); ?>","dimRatio":50,"overlayColor":"contrast","minHeight":600,"align":"full"} -->
<div class="wp-block-cover alignfull" style="min-height:600px">
    <span aria-hidden="true" class="wp-block-cover__background has-contrast-background-color has-background-dim"></span>
    <div class="wp-block-cover__inner-container">
        <!-- wp:group {"layout":{"type":"constrained","contentSize":"800px"}} -->
        <div class="wp-block-group">
            <!-- wp:heading {"textAlign":"center","level":1,"style":{"typography":{"fontSize":"4rem","fontWeight":"800"},"color":{"text":"#ffffff"}}} -->
            <h1 class="wp-block-heading has-text-align-center" style="color:#ffffff;font-size:4rem;font-weight:800">Summer Collection 2025</h1>
            <!-- /wp:heading -->

            <!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"1.25rem"},"color":{"text":"#ffffff"},"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} -->
            <p class="has-text-align-center" style="color:#ffffff;margin-top:var(--wp--preset--spacing--30);font-size:1.25rem">Discover the latest trends and exclusive deals</p>
            <!-- /wp:paragraph -->

            <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"},"style":{"spacing":{"margin":{"top":"var:preset|spacing|40"}}}} -->
            <div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--40)">
                <!-- wp:button {"backgroundColor":"primary","className":"is-style-fill"} -->
                <div class="wp-block-button is-style-fill"><a class="wp-block-button__link has-primary-background-color has-background wp-element-button" href="/shop">Shop Now</a></div>
                <!-- /wp:button -->

                <!-- wp:button {"backgroundColor":"base","textColor":"contrast","className":"is-style-outline"} -->
                <div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-contrast-color has-base-background-color has-text-color has-background wp-element-button" href="/about">Learn More</a></div>
                <!-- /wp:button -->
            </div>
            <!-- /wp:buttons -->
        </div>
        <!-- /wp:group -->
    </div>
</div>
<!-- /wp:cover -->
