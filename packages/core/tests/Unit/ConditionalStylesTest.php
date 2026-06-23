<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\ConditionalStyles;

final class ConditionalStylesTest extends TestCase {
    protected function setUp(): void { parent::setUp(); Monkey\setUp(); }
    protected function tearDown(): void { Monkey\tearDown(); parent::tearDown(); }

    public function test_non_global_sheet_is_registered_not_enqueued(): void {
        // Use a REAL temp dir so the unmockable PHP internals file_exists()/filemtime()
        // see actual files and the loop genuinely reaches the register/enqueue branch.
        $dir = sys_get_temp_dir() . '/stratawp-cs-' . uniqid();
        mkdir($dir . '/dist/css', 0777, true);
        file_put_contents($dir . '/dist/css/comments.css', '');
        file_put_contents($dir . '/dist/css/sidebar.css', '');
        file_put_contents($dir . '/dist/css/widgets.css', '');

        Functions\when('get_template_directory')->justReturn($dir);
        Functions\when('get_template_directory_uri')->justReturn('https://example.test/t');
        Functions\when('apply_filters')->returnArg(2);
        Functions\when('is_singular')->justReturn(false);
        Functions\when('comments_open')->justReturn(false);
        Functions\when('is_active_sidebar')->justReturn(false);
        Functions\when('wp_style_add_data')->justReturn(true);

        // All default sheets are non-global, so each must be REGISTERED, never enqueued.
        Functions\expect('wp_register_style')->atLeast()->once();
        Functions\expect('wp_enqueue_style')->never();

        (new ConditionalStyles())->enqueue_styles();

        array_map('unlink', glob($dir . '/dist/css/*'));
        rmdir($dir . '/dist/css'); rmdir($dir . '/dist'); rmdir($dir);
        $this->addToAssertionCount(1);
    }

    public function test_preload_emits_onload_swap_for_matching_sheet(): void {
        Functions\when('apply_filters')->returnArg(2);
        Functions\when('is_singular')->justReturn(true);
        Functions\when('comments_open')->justReturn(true);
        Functions\when('is_active_sidebar')->justReturn(false);
        Functions\when('esc_url')->returnArg(1);
        Functions\when('esc_attr')->returnArg(1);

        // Fake wp_styles() registry with the comments handle registered.
        $styles = new \stdClass();
        $styles->registered = array(
            'stratawp-comments' => (object) array( 'src' => 'https://example.test/t/dist/css/comments.css', 'ver' => '123' ),
        );
        Functions\when('wp_styles')->justReturn($styles);

        $this->expectOutputRegex('/rel="preload"[^>]*as="style"[^>]*onload="this\.rel=.stylesheet./');
        (new ConditionalStyles())->preload_styles();
    }
}
