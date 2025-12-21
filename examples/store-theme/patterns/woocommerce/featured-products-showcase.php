<?php
/**
 * Title: Featured Products Showcase
 * Slug: strata-store/featured-products-showcase
 * Categories: woocommerce
 * Description: Showcase featured products with a heading and description
 */
?>

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">
    <!-- wp:heading {"textAlign":"center","style":{"typography":{"fontSize":"3rem","fontWeight":"700"}}} -->
    <h2 class="wp-block-heading has-text-align-center" style="font-size:3rem;font-weight:700">Featured Products</h2>
    <!-- /wp:heading -->

    <!-- wp:paragraph {"align":"center","style":{"spacing":{"margin":{"top":"var:preset|spacing|20"}}}} -->
    <p class="has-text-align-center" style="margin-top:var(--wp--preset--spacing--20)">Discover our handpicked selection of premium products</p>
    <!-- /wp:paragraph -->

    <!-- wp:strata-store/featured-products {"columns":4,"limit":8,"style":{"spacing":{"margin":{"top":"var:preset|spacing|50"}}}} /-->
</div>
<!-- /wp:group -->
