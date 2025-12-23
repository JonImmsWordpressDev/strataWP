<?php
/**
 * Title: Shop by Category
 * Slug: strata-store/shop-by-category
 * Categories: woocommerce
 * Description: Product categories grid with heading
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}},"backgroundColor":"var(--wp--preset--color--neutral)"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">
    <!-- wp:heading {"textAlign":"center","style":{"typography":{"fontSize":"3rem","fontWeight":"700"}}} -->
    <h2 class="wp-block-heading has-text-align-center" style="font-size:3rem;font-weight:700">Shop by Category</h2>
    <!-- /wp:heading -->

    <!-- wp:paragraph {"align":"center","style":{"spacing":{"margin":{"top":"var:preset|spacing|20"}}}} -->
    <p class="has-text-align-center" style="margin-top:var(--wp--preset--spacing--20)">Browse our carefully curated product collections</p>
    <!-- /wp:paragraph -->

    <!-- wp:strata-store/product-categories {"columns":4,"limit":8,"style":{"spacing":{"margin":{"top":"var:preset|spacing|50"}}}} /-->
</div>
<!-- /wp:group -->
