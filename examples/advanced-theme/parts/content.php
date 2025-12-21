<?php
/**
 * Default post content template
 *
 * @package ForgeBasic
 */
?>

<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <header class="entry-header">
        <?php
        if ( is_singular() ) :
            the_title( '<h1 class="entry-title">', '</h1>' );
        else :
            the_title( '<h2 class="entry-title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' );
        endif;

        if ( 'post' === get_post_type() ) :
            ?>
            <div class="entry-meta">
                <time class="entry-date" datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>">
                    <?php echo esc_html( get_the_date() ); ?>
                </time>
                <span class="entry-author">
                    <?php
                    printf(
                        /* translators: %s: Author name */
                        esc_html__( 'by %s', 'forge-basic' ),
                        '<a href="' . esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ) . '">' .
                        esc_html( get_the_author() ) .
                        '</a>'
                    );
                    ?>
                </span>
            </div>
            <?php
        endif;
        ?>
    </header>

    <?php
    if ( has_post_thumbnail() && ! is_singular() ) :
        ?>
        <div class="entry-thumbnail">
            <a href="<?php the_permalink(); ?>">
                <?php the_post_thumbnail( 'medium_large' ); ?>
            </a>
        </div>
        <?php
    endif;
    ?>

    <div class="entry-content">
        <?php
        if ( is_singular() ) :
            the_content();
        else :
            the_excerpt();
        endif;
        ?>
    </div>

    <?php
    if ( is_singular() ) :
        ?>
        <footer class="entry-footer">
            <?php
            $categories = get_the_category_list( ', ' );
            if ( $categories ) :
                ?>
                <div class="entry-categories">
                    <?php
                    printf(
                        /* translators: %s: Category list */
                        esc_html__( 'Posted in %s', 'forge-basic' ),
                        $categories // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                    );
                    ?>
                </div>
                <?php
            endif;

            $tags = get_the_tag_list( '', ', ' );
            if ( $tags ) :
                ?>
                <div class="entry-tags">
                    <?php
                    printf(
                        /* translators: %s: Tag list */
                        esc_html__( 'Tagged %s', 'forge-basic' ),
                        $tags // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                    );
                    ?>
                </div>
                <?php
            endif;
            ?>
        </footer>
        <?php
    endif;
    ?>
</article>
