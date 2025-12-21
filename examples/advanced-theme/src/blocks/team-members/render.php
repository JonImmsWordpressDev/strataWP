<?php
/**
 * Team Members Block Render
 *
 * @package StrataAdvanced
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

$columns = $attributes['columns'] ?? 4;
$posts_per_page = $attributes['postsPerPage'] ?? -1;
$department = $attributes['department'] ?? '';
$show_bio = $attributes['showBio'] ?? true;

$args = [
    'post_type'      => 'team',
    'posts_per_page' => $posts_per_page,
    'orderby'        => 'menu_order',
    'order'          => 'ASC',
];

if ( ! empty( $department ) ) {
    $args['tax_query'] = [
        [
            'taxonomy' => 'team_department',
            'field'    => 'slug',
            'terms'    => $department,
        ],
    ];
}

$query = new WP_Query( $args );

if ( ! $query->have_posts() ) {
    return;
}

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'team-grid columns-' . esc_attr( $columns ),
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <?php while ( $query->have_posts() ) : $query->the_post(); ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class( 'team-member' ); ?>>
            <?php if ( has_post_thumbnail() ) : ?>
                <div class="team-photo">
                    <?php the_post_thumbnail( 'medium' ); ?>
                </div>
            <?php endif; ?>

            <div class="team-info">
                <h3 class="team-name"><?php the_title(); ?></h3>

                <?php
                $position = get_post_meta( get_the_ID(), '_team_position', true );
                if ( $position ) :
                    ?>
                    <p class="team-position"><?php echo esc_html( $position ); ?></p>
                <?php endif; ?>

                <?php if ( $show_bio && has_excerpt() ) : ?>
                    <div class="team-bio">
                        <?php the_excerpt(); ?>
                    </div>
                <?php endif; ?>

                <?php
                // Social links
                $social_links = [
                    'linkedin' => get_post_meta( get_the_ID(), '_team_linkedin', true ),
                    'twitter'  => get_post_meta( get_the_ID(), '_team_twitter', true ),
                    'email'    => get_post_meta( get_the_ID(), '_team_email', true ),
                ];

                $has_social = array_filter( $social_links );
                if ( ! empty( $has_social ) ) :
                    ?>
                    <div class="team-social">
                        <?php if ( $social_links['linkedin'] ) : ?>
                            <a href="<?php echo esc_url( $social_links['linkedin'] ); ?>" target="_blank" rel="noopener" aria-label="LinkedIn">
                                <span class="dashicons dashicons-linkedin"></span>
                            </a>
                        <?php endif; ?>

                        <?php if ( $social_links['twitter'] ) : ?>
                            <a href="<?php echo esc_url( $social_links['twitter'] ); ?>" target="_blank" rel="noopener" aria-label="Twitter">
                                <span class="dashicons dashicons-twitter"></span>
                            </a>
                        <?php endif; ?>

                        <?php if ( $social_links['email'] ) : ?>
                            <a href="mailto:<?php echo esc_attr( $social_links['email'] ); ?>" aria-label="Email">
                                <span class="dashicons dashicons-email"></span>
                            </a>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        </article>
    <?php endwhile; ?>
</div>

<?php
wp_reset_postdata();
