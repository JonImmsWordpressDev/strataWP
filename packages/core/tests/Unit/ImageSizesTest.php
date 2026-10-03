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
    protected function tearDown(): void {
        $this->remove_dir($this->theme_dir);
        $this->theme_dir = '';
        Monkey\tearDown();
        parent::tearDown();
    }

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

    private string $theme_dir = '';

    private function remove_dir(string $dir): void {
        if ('' === $dir || !is_dir($dir)) {
            return;
        }
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST) as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }

    private function make_theme(array $files): void {
        $this->theme_dir = sys_get_temp_dir() . '/sw-theme-' . uniqid('', true);
        foreach ($files as $file) {
            $path = $this->theme_dir . '/' . $file;
            if (!is_dir(dirname($path))) {
                mkdir(dirname($path), 0777, true);
            }
            file_put_contents($path, 'x');
        }
        $dir = $this->theme_dir;
        Functions\when('get_theme_file_path')->alias(static fn(string $p): string => $dir . '/' . $p);
        Functions\when('get_theme_file_uri')->alias(static fn(string $p): string => 'https://example.test/' . $p);
        Functions\when('esc_url')->returnArg();
        Functions\when('esc_attr')->alias(static fn($v): string => htmlspecialchars((string) $v, ENT_QUOTES));
    }

    public function test_picture_sources_prefer_avif_then_webp(): void {
        $this->make_theme(['dist/images/hero.jpg', 'dist/images/hero.avif', 'dist/images/hero.webp']);
        $sources = (new ImageSizes())->get_picture_sources('dist/images/hero.jpg');
        $this->assertSame(
            [
                ['type' => 'image/avif', 'srcset' => 'https://example.test/dist/images/hero.avif'],
                ['type' => 'image/webp', 'srcset' => 'https://example.test/dist/images/hero.webp'],
            ],
            $sources
        );
    }

    public function test_picture_sources_skip_missing_siblings(): void {
        $this->make_theme(['dist/images/hero.png', 'dist/images/hero.webp']);
        $sources = (new ImageSizes())->get_picture_sources('dist/images/hero.png');
        $this->assertSame([['type' => 'image/webp', 'srcset' => 'https://example.test/dist/images/hero.webp']], $sources);
    }

    public function test_picture_sources_ignore_non_raster(): void {
        $this->make_theme(['dist/images/logo.svg', 'dist/images/logo.webp']);
        $this->assertSame([], (new ImageSizes())->get_picture_sources('dist/images/logo.svg'));
    }

    public function test_picture_sources_find_uppercase_extension(): void {
        $this->make_theme(['dist/images/UPPER.PNG', 'dist/images/UPPER.avif']);
        $sources = (new ImageSizes())->get_picture_sources('dist/images/UPPER.PNG');
        $this->assertSame([['type' => 'image/avif', 'srcset' => 'https://example.test/dist/images/UPPER.avif']], $sources);
    }

    public function test_traversal_paths_return_nothing_even_if_the_file_exists(): void {
        $this->make_theme(['secret.png', 'secret.avif', 'secret.webp', 'dist/images/placeholder.png']);
        $component = new ImageSizes();
        $this->assertSame([], $component->get_picture_sources('dist/../secret.png'));
        $this->assertSame('', $component->render_picture('dist/../secret.png', 'x'));
        $this->assertSame('', $component->render_picture('/etc/passwd.png', 'x'));
    }

    public function test_render_picture_returns_empty_when_original_is_missing(): void {
        $this->make_theme(['dist/images/other.png']);
        $this->assertSame('', (new ImageSizes())->render_picture('dist/images/nope.png', 'x'));
    }

    public function test_render_picture_wraps_sources_and_img(): void {
        $this->make_theme(['dist/images/hero.jpg', 'dist/images/hero.avif']);
        $html = (new ImageSizes())->render_picture('dist/images/hero.jpg', 'A hero', ['class' => 'hero', 'loading' => 'lazy']);
        $this->assertSame(
            '<picture><source type="image/avif" srcset="https://example.test/dist/images/hero.avif">'
            . '<img src="https://example.test/dist/images/hero.jpg" alt="A hero" class="hero" loading="lazy"></picture>',
            $html
        );
    }

    public function test_render_picture_without_siblings_is_a_bare_img(): void {
        $this->make_theme(['dist/images/hero.jpg']);
        $html = (new ImageSizes())->render_picture('dist/images/hero.jpg', 'A hero');
        $this->assertSame('<img src="https://example.test/dist/images/hero.jpg" alt="A hero">', $html);
    }

    public function test_render_picture_escapes_alt_and_drops_unsafe_attributes(): void {
        $this->make_theme(['dist/images/hero.jpg']);
        $html = (new ImageSizes())->render_picture(
            'dist/images/hero.jpg',
            '"><script>alert(1)</script>',
            ['onerror' => 'alert(1)', 'src' => 'https://evil.test/x.jpg', 'data-x' => 'a"b', 'Bad Name' => 'x']
        );
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('onerror', $html);
        $this->assertStringNotContainsString('evil.test', $html);
        $this->assertStringNotContainsString('Bad Name', $html);
        $this->assertStringContainsString('data-x="a&quot;b"', $html);
    }
}
