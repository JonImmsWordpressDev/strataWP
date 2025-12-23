<?php
/**
 * Product Categories Block Render
 *
 * @package StrataStore
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

if ( ! class_exists( 'WooCommerce' ) ) {
    return;
}

$columns = $attributes['columns'] ?? 4;
$limit = $attributes['limit'] ?? 8;
$show_count = $attributes['showCount'] ?? true;
$show_empty = $attributes['showEmpty'] ?? false;

$args = [
    'taxonomy'   => 'product_cat',
    'orderby'    => 'name',
    'order'      => 'ASC',
    'number'     => $limit,
    'hide_empty' => ! $show_empty,
    'parent'     => 0, // Only top-level categories
];

$categories = get_terms( $args );

if ( empty( $categories ) || is_wp_error( $categories ) ) {
    return;
}

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'strata-product-categories columns-' . esc_attr( $columns ),
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <div class="categories-grid">
        <?php foreach ( $categories as $category ) : ?>
            <?php
            $thumbnail_id = get_term_meta( $category->term_id, 'thumbnail_id', true );
            $image_url = $thumbnail_id ? wp_get_attachment_url( $thumbnail_id ) : wc_placeholder_img_src();
            ?>

            <div class="category-item">
                <a href="<?php echo esc_url( get_term_link( $category ) ); ?>" class="category-link">
                    <div class="category-image">
                        <img src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( $category->name ); ?>">
                    </div>

                    <div class="category-info">
                        <h3 class="category-name"><?php echo esc_html( $category->name ); ?></h3>

                        <?php if ( $show_count && $category->count > 0 ) : ?>
                            <span class="category-count">
                                <?php
                                printf(
                                    /* translators: %s: Number of products */
                                    _n( '%s Product', '%s Products', $category->count, 'strata-store' ),
                                    number_format_i18n( $category->count )
                                );
                                ?>
                            </span>
                        <?php endif; ?>

                        <?php if ( $category->description ) : ?>
                            <p class="category-description">
                                <?php echo wp_kses_post( wp_trim_words( $category->description, 15 ) ); ?>
                            </p>
                        <?php endif; ?>
                    </div>
                </a>
            </div>
        <?php endforeach; ?>
    </div>
</div>
