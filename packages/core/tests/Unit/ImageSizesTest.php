<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Brain\Monkey\Filters;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\ImageSizes;

final class ImageSizesTest extends TestCase {
    protected function setUp(): void { parent::setUp(); Monkey\setUp(); }
    protected function tearDown(): void { Monkey\tearDown(); parent::tearDown(); }

    public function test_slug(): void {
        $this->assertSame('image-sizes', (new ImageSizes())->get_slug());
    }

    public function test_initialize_registers_sizes_filters(): void {
        Filters\expectAdded('wp_calculate_image_sizes')->once();
        Filters\expectAdded('wp_get_attachment_image_attributes')->once();
        (new ImageSizes())->initialize();
        $this->addToAssertionCount(1);
    }

    public function test_content_sizes_full_width_without_sidebar(): void {
        Functions\when('is_active_sidebar')->justReturn(false);
        $this->assertSame('100vw', (new ImageSizes())->filter_content_image_sizes_attr('', array(800, 600)));
    }

    public function test_content_sizes_accounts_for_active_sidebar(): void {
        Functions\when('is_active_sidebar')->justReturn(true);
        $this->assertSame('(min-width: 960px) 75vw, 100vw', (new ImageSizes())->filter_content_image_sizes_attr('', array(800, 600)));
    }
}
