<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Actions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Setup;

final class SetupTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function test_get_slug_returns_setup(): void {
        $this->assertSame('setup', (new Setup())->get_slug());
    }

    public function test_initialize_registers_after_setup_theme_actions(): void {
        Actions\expectAdded('after_setup_theme')->twice();

        (new Setup())->initialize();
    }
}
