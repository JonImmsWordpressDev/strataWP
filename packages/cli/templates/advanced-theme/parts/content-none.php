<?php
/**
 * No content template
 *
 * @package ForgeBasic
 */
?>

<section class="no-results not-found">
    <header class="page-header">
        <h1 class="page-title">
            <?php esc_html_e( 'Nothing Found', 'forge-basic' ); ?>
        </h1>
    </header>

    <div class="page-content">
        <?php if ( is_search() ) : ?>
            <p>
                <?php esc_html_e( 'Sorry, but nothing matched your search terms. Please try again with different keywords.', 'forge-basic' ); ?>
            </p>
            <?php get_search_form(); ?>
        <?php else : ?>
            <p>
                <?php esc_html_e( 'It seems we can\'t find what you\'re looking for. Perhaps searching can help.', 'forge-basic' ); ?>
            </p>
            <?php get_search_form(); ?>
        <?php endif; ?>
    </div>
</section>
