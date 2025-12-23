<?php
/**
 * Portfolio Grid Block Render
 *
 * @package StrataAdvanced
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

$columns = $attributes['columns'] ?? 3;
$posts_per_page = $attributes['postsPerPage'] ?? 9;
$category = $attributes['category'] ?? '';
$orderby = $attributes['orderBy'] ?? 'date';
$order = $attributes['order'] ?? 'DESC';

$args = [
    'post_type'      => 'portfolio',
    'posts_per_page' => $posts_per_page,
    'orderby'        => $orderby,
    'order'          => $order,
];

if ( ! empty( $category ) ) {
    $args['tax_query'] = [
        [
            'taxonomy' => 'portfolio_category',
            'field'    => 'slug',
            'terms'    => $category,
        ],
    ];
}

$query = new WP_Query( $args );

if ( ! $query->have_posts() ) {
    return;
}

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'portfolio-grid columns-' . esc_attr( $columns ),
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <?php while ( $query->have_posts() ) : $query->the_post(); ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class( 'portfolio-item' ); ?>>
            <?php if ( has_post_thumbnail() ) : ?>
                <div class="portfolio-thumbnail">
                    <a href="<?php the_permalink(); ?>">
                        <?php the_post_thumbnail( 'large' ); ?>
                    </a>
                </div>
            <?php endif; ?>

            <div class="portfolio-content">
                <h3 class="portfolio-title">
                    <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                </h3>

                <?php if ( has_excerpt() ) : ?>
                    <div class="portfolio-excerpt">
                        <?php the_excerpt(); ?>
                    </div>
                <?php endif; ?>

                <div class="portfolio-meta">
                    <?php
                    $categories = get_the_terms( get_the_ID(), 'portfolio_category' );
                    if ( $categories && ! is_wp_error( $categories ) ) :
                        ?>
                        <span class="portfolio-categories">
                            <?php
                            $category_names = array_map( function( $cat ) {
                                return $cat->name;
                            }, $categories );
                            echo esc_html( implode( ', ', $category_names ) );
                            ?>
                        </span>
                    <?php endif; ?>
                </div>

                <a href="<?php the_permalink(); ?>" class="portfolio-link">
                    <?php esc_html_e( 'View Project', 'strata-advanced' ); ?> →
                </a>
            </div>
        </article>
    <?php endwhile; ?>
</div>

<?php
wp_reset_postdata();
