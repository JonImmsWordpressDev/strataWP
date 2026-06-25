<?php
/**
 * Title: Footer with text, button, links.
 * Slug: strata-basic/footer-mega-dark
 * Categories: footer
 * Block Types: core/template-part/footer
 */
?>
<!-- wp:group {"align":"full","style":{"elements":{"link":{"color":{"text":"var:preset|color|base"}}},"spacing":{"padding":{"top":"var:preset|spacing|x-large","bottom":"var:preset|spacing|x-large","left":"30px","right":"30px"},"margin":{"top":"0px"}}},"backgroundColor":"contrast","textColor":"base","className":"has-background-color","layout":{"type":"constrained"},"fontSize":"small"} -->
<div class="wp-block-group alignfull has-background-color has-base-color has-contrast-background-color has-text-color has-background has-link-color has-small-font-size" style="margin-top:0px;padding-top:var(--wp--preset--spacing--x-large);padding-right:30px;padding-bottom:var(--wp--preset--spacing--x-large);padding-left:30px">
	<!-- wp:columns {"align":"wide","style":{"elements":{"link":{"color":[]}}}} -->
	<div class="wp-block-columns alignwide has-link-color">
		<!-- wp:column {"width":"55%"} -->
		<div class="wp-block-column" style="flex-basis:55%"><!-- wp:heading {"level":4,"anchor":"our-company","className":"wp-block-heading"} -->
			<h4 class="wp-block-heading" id="our-company"><?php echo esc_html__( 'Our Company', 'strata-basic' ); ?></h4>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html__( 'With its clean, minimal design and powerful feature set, Frost enables agencies to build stylish and sophisticated WordPress websites.', 'strata-basic' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:buttons -->
			<div class="wp-block-buttons">
				<!-- wp:button {"style":{"spacing":{"padding":{"top":"var:preset|spacing|x-small","bottom":"var:preset|spacing|x-small","left":"var:preset|spacing|medium","right":"var:preset|spacing|medium"}}},"className":"is-style-fill"} -->
				<div class="wp-block-button is-style-fill"><a class="wp-block-button__link wp-element-button" href="#" style="padding-top:var(--wp--preset--spacing--x-small);padding-right:var(--wp--preset--spacing--medium);padding-bottom:var(--wp--preset--spacing--x-small);padding-left:var(--wp--preset--spacing--medium)"><?php echo esc_html__( 'Learn More', 'strata-basic' ); ?></a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column {"width":"15%"} -->
		<div class="wp-block-column" style="flex-basis:15%">
			<!-- wp:heading {"level":4,"anchor":"about-us","className":"wp-block-heading"} -->
			<h4 class="wp-block-heading" id="about-us"><?php echo esc_html__( 'About Us', 'strata-basic' ); ?></h4>
			<!-- /wp:heading -->
			<!-- wp:list -->
			<ul>
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Start Here', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Our Mission', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Brand Guide', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Newsletter', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Accessibility', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column {"width":"15%"} -->
		<div class="wp-block-column" style="flex-basis:15%">
			<!-- wp:heading {"level":4,"anchor":"services","className":"wp-block-heading"} -->
			<h4 class="wp-block-heading" id="services"><?php echo esc_html__( 'Services', 'strata-basic' ); ?></h4>
			<!-- /wp:heading -->
			<!-- wp:list -->
			<ul>
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Web Design', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Development', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Copywriting', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Marketing', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Social Media', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column {"width":"15%"} -->
		<div class="wp-block-column" style="flex-basis:15%">
			<!-- wp:heading {"level":4,"anchor":"connect","className":"wp-block-heading"} -->
			<h4 class="wp-block-heading" id="connect"><?php echo esc_html__( 'Connect', 'strata-basic' ); ?></h4>
			<!-- /wp:heading -->
			<!-- wp:list -->
			<ul>
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Facebook', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Instagram', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Twitter', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'LinkedIn', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
				<!-- wp:list-item -->
				<li><a href="#"><?php echo esc_html__( 'Dribbble', 'strata-basic' ); ?></a></li>
				<!-- /wp:list-item -->
			</ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</div>
<!-- /wp:group -->
