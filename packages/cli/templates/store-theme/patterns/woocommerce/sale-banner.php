<?php
/**
 * Title: Sale Banner
 * Slug: strata-store/sale-banner
 * Categories: woocommerce
 * Description: Eye-catching sale announcement banner
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40"}},"backgroundColor":"primary"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-primary-background-color has-background" style="padding-top:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40)">
    <!-- wp:columns {"verticalAlignment":"center"} -->
    <div class="wp-block-columns are-vertically-aligned-center">
        <!-- wp:column {"verticalAlignment":"center","width":"70%"} -->
        <div class="wp-block-column is-vertically-aligned-center" style="flex-basis:70%">
            <!-- wp:heading {"style":{"typography":{"fontSize":"2.5rem","fontWeight":"800"},"color":{"text":"#ffffff"}}} -->
            <h2 class="wp-block-heading" style="color:#ffffff;font-size:2.5rem;font-weight:800">🎉 Summer Sale - Up to 50% Off!</h2>
            <!-- /wp:heading -->

            <!-- wp:paragraph {"style":{"typography":{"fontSize":"1.125rem"},"color":{"text":"#ffffff"}}} -->
            <p style="color:#ffffff;font-size:1.125rem">Limited time offer on selected items. Don't miss out!</p>
            <!-- /wp:paragraph -->
        </div>
        <!-- /wp:column -->

        <!-- wp:column {"verticalAlignment":"center","width":"30%"} -->
        <div class="wp-block-column is-vertically-aligned-center" style="flex-basis:30%">
            <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
            <div class="wp-block-buttons">
                <!-- wp:button {"backgroundColor":"base","textColor":"contrast","style":{"border":{"radius":"50px"}}} -->
                <div class="wp-block-button"><a class="wp-block-button__link has-contrast-color has-base-background-color has-text-color has-background wp-element-button" href="/shop" style="border-radius:50px">Shop Sale Items →</a></div>
                <!-- /wp:button -->
            </div>
            <!-- /wp:buttons -->
        </div>
        <!-- /wp:column -->
    </div>
    <!-- /wp:columns -->
</div>
<!-- /wp:group -->
