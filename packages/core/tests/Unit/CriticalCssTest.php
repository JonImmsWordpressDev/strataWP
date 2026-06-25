<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\CriticalCss;

final class CriticalCssTest extends TestCase {

	private string $dir;

	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();
		$this->dir = sys_get_temp_dir() . '/stratawp-critical-' . uniqid();
	}

	protected function tearDown(): void {
		if ( is_dir( $this->dir ) ) {
			array_map( 'unlink', glob( $this->dir . '/dist/critical/*' ) ?: array() );
			@rmdir( $this->dir . '/dist/critical' );
			@rmdir( $this->dir . '/dist' );
			@rmdir( $this->dir );
		}
		Monkey\tearDown();
		parent::tearDown();
	}

	private function with_critical( string $css ): void {
		mkdir( $this->dir . '/dist/critical', 0777, true );
		file_put_contents( $this->dir . '/dist/critical/critical.css', $css );
		Functions\when( 'get_template_directory' )->justReturn( $this->dir );
	}

	public function test_slug(): void {
		$this->assertSame( 'critical-css', ( new CriticalCss() )->get_slug() );
	}

	public function test_initialize_registers_hooks_when_enabled(): void {
		Functions\when( 'apply_filters' )->returnArg( 2 );
		Actions\expectAdded( 'wp_head' )->once();
		Filters\expectAdded( 'style_loader_tag' )->once();
		( new CriticalCss() )->initialize();
		$this->addToAssertionCount( 1 );
	}

	public function test_initialize_registers_nothing_when_disabled(): void {
		Functions\when( 'apply_filters' )->alias(
			fn( $hook, $value ) => 'stratawp_critical_css_enabled' === $hook ? false : $value
		);
		Actions\expectAdded( 'wp_head' )->never();
		Filters\expectAdded( 'style_loader_tag' )->never();
		( new CriticalCss() )->initialize();
		$this->addToAssertionCount( 1 );
	}

	public function test_inline_outputs_style_when_file_present(): void {
		$this->with_critical( 'body{color:red}' );
		$this->expectOutputRegex( '/<style id="stratawp-critical-css">body\{color:red\}<\/style>/' );
		( new CriticalCss() )->inline_critical_css();
	}

	public function test_inline_outputs_nothing_without_file(): void {
		Functions\when( 'get_template_directory' )->justReturn( $this->dir );
		$this->expectOutputString( '' );
		( new CriticalCss() )->inline_critical_css();
	}

	public function test_async_rewrites_main_stylesheet_when_critical_present(): void {
		$this->with_critical( 'body{}' );
		Functions\when( 'apply_filters' )->returnArg( 2 );
		Functions\when( 'esc_url' )->returnArg( 1 );
		$tag = '<link rel="stylesheet" id="stratawp-main-0-css" href="https://e.test/main.css" media="all" />';
		$out = ( new CriticalCss() )->async_stylesheet( $tag, 'stratawp-main-0' );
		$this->assertStringContainsString( 'rel="preload"', $out );
		$this->assertStringContainsString( "onload=\"this.onload=null;this.rel='stylesheet'\"", $out );
		$this->assertStringContainsString( '<noscript>', $out );
	}

	public function test_async_leaves_tag_when_no_critical(): void {
		Functions\when( 'get_template_directory' )->justReturn( $this->dir );
		Functions\when( 'apply_filters' )->returnArg( 2 );
		$tag = '<link rel="stylesheet" id="stratawp-main-0-css" href="https://e.test/main.css" />';
		$this->assertSame( $tag, ( new CriticalCss() )->async_stylesheet( $tag, 'stratawp-main-0' ) );
	}

	public function test_async_leaves_unlisted_handle(): void {
		$this->with_critical( 'body{}' );
		Functions\when( 'apply_filters' )->returnArg( 2 );
		$tag = '<link rel="stylesheet" id="other-css" href="https://e.test/o.css" />';
		$this->assertSame( $tag, ( new CriticalCss() )->async_stylesheet( $tag, 'other' ) );
	}
}
