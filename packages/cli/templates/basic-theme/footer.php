<?php
/**
 * Footer template
 *
 * @package StrataBasic
 */
?>

    <footer id="colophon" class="site-footer">
        <div class="site-info">
            <p>
                <?php
                printf(
                    /* translators: 1: Theme name, 2: Theme author link */
                    esc_html__( '%1$s by %2$s', 'strata-basic' ),
                    '<a href="' . esc_url( 'https://github.com/JonImmsWordpressDev/StrataWP' ) . '">StrataWP</a>',
                    '<a href="' . esc_url( 'https://github.com/JonImmsWordpressDev' ) . '">Jon Imms</a>'
                );
                ?>
            </p>
            <p class="strata-badge">
                ⚒️ Built with <strong>StrataWP</strong>
            </p>
        </div>

        <?php
        if ( has_nav_menu( 'footer' ) ) :
            ?>
            <nav class="footer-navigation" aria-label="<?php esc_attr_e( 'Footer Navigation', 'strata-basic' ); ?>">
                <?php
                wp_nav_menu([
                    'theme_location' => 'footer',
                    'menu_class'     => 'footer-menu',
                    'container'      => false,
                    'depth'          => 1,
                    'fallback_cb'    => false,
                ]);
                ?>
            </nav>
            <?php
        endif;
        ?>
    </footer>
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>
