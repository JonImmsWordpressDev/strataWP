<?php
/**
 * Hero Block Render
 *
 * @package StrataBasic
 * @var array $attributes Block attributes
 */

$title            = $attributes['title'] ?? 'Welcome to StrataWP';
$description      = $attributes['description'] ?? 'Build faster, better WordPress themes';
$button_text      = $attributes['buttonText'] ?? 'Get Started';
$button_url       = $attributes['buttonUrl'] ?? '#';
$background_image = $attributes['backgroundImage'] ?? '';
$overlay_opacity  = $attributes['overlayOpacity'] ?? 0.5;

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-strata-basic-hero',
    'style' => $background_image ? 'background-image: url(' . esc_url( $background_image ) . ');' : '',
]);
?>

<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
    <?php if ( $background_image ) : ?>
        <div class="hero-overlay" style="opacity: <?php echo esc_attr( $overlay_opacity ); ?>;"></div>
    <?php endif; ?>

    <div class="hero-content">
        <h1 class="hero-title">
            <?php echo esc_html( $title ); ?>
        </h1>
        <p class="hero-description">
            <?php echo esc_html( $description ); ?>
        </p>
        <div class="hero-button-wrapper">
            <a href="<?php echo esc_url( $button_url ); ?>" class="hero-button">
                <?php echo esc_html( $button_text ); ?>
            </a>
        </div>
    </div>
</div>
