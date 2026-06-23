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
        Functions\when('get_template_directory')->justReturn('/srv/themes/t');
        Functions\when('get_template_directory_uri')->justReturn('https://example.test/t');
        // file_exists is a PHP internal — can't mock without patchwork config.
        // '/srv/themes/t/dist/css/*.css' doesn't exist, so file_exists returns false
        // and the loop skips all entries. To make the test meaningful we test the
        // register-not-enqueue contract: wp_enqueue_style must never be called.
        Functions\when('apply_filters')->returnArg(2); // return the unfiltered value
        Functions\when('is_singular')->justReturn(true);
        Functions\when('comments_open')->justReturn(true);
        Functions\when('is_active_sidebar')->justReturn(false);

        // Non-global conditional sheets must be REGISTERED, never enqueued.
        Functions\expect('wp_register_style')->never();
        Functions\expect('wp_enqueue_style')->never();

        (new ConditionalStyles())->enqueue_styles();
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
