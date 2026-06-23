<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Performance;

final class PerformanceTest extends TestCase {
    protected function setUp(): void { parent::setUp(); Monkey\setUp(); }
    protected function tearDown(): void { Monkey\tearDown(); parent::tearDown(); }

    public function test_defer_applied_to_default_handle(): void {
        Functions\when('apply_filters')->alias(function ($hook, $value) { return $value; });
        $out = (new Performance())->add_async_defer('<script src="x"></script>', 'stratawp-main', 'x');
        $this->assertStringContainsString('<script defer ', $out);
    }

    public function test_async_applied_when_handle_in_async_filter(): void {
        Functions\when('apply_filters')->alias(function ($hook, $value) {
            if ('stratawp_async_scripts' === $hook) { return array('my-async'); }
            return $value;
        });
        $out = (new Performance())->add_async_defer('<script src="x"></script>', 'my-async', 'x');
        $this->assertStringContainsString('<script async ', $out);
        $this->assertStringNotContainsString('defer', $out);
    }

    public function test_untouched_handle_unchanged(): void {
        Functions\when('apply_filters')->alias(function ($hook, $value) { return $value; });
        $tag = '<script src="x"></script>';
        $this->assertSame($tag, (new Performance())->add_async_defer($tag, 'other', 'x'));
    }
}
