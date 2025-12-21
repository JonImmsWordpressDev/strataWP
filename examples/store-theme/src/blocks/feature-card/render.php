<?php
/**
 * Feature Card Block Render
 *
 * @package ForgeBasic
 * @var array $attributes Block attributes
 */

$title                  = $attributes['title'] ?? 'Feature Title';
$description            = $attributes['description'] ?? 'Feature description goes here';
$icon                   = $attributes['icon'] ?? '⚡';
$icon_background_color  = $attributes['iconBackgroundColor'] ?? '#3b82f6';

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-forge-basic-feature-card',
]);
?>

<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
    <div class="feature-icon" style="background-color: <?php echo esc_attr( $icon_background_color ); ?>;">
        <span class="feature-icon-content">
            <?php echo esc_html( $icon ); ?>
        </span>
    </div>
    <h3 class="feature-title">
        <?php echo esc_html( $title ); ?>
    </h3>
    <p class="feature-description">
        <?php echo esc_html( $description ); ?>
    </p>
</div>
