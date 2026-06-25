<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use StrataWP\Theme;

final class ThemeDefaultsTest extends TestCase {
    protected function setUp(): void { parent::setUp(); Monkey\setUp(); }
    protected function tearDown(): void { Monkey\tearDown(); parent::tearDown(); }

    public function test_default_components_include_conditional_styles_and_image_sizes(): void {
        Functions\when('apply_filters')->returnArg(2); // stratawp_theme_components passthrough
        $theme = new Theme();
        $slugs = array_keys($theme->components());
        $this->assertContains('conditional-styles', $slugs);
        $this->assertContains('image-sizes', $slugs);
        $this->assertContains('critical-css', $slugs);
    }
}
