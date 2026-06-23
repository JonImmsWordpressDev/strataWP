<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Assets;

final class FakeManifestAssets extends Assets {
    public array $fakeManifest = array();
    protected function get_manifest(): ?array {
        return $this->fakeManifest;
    }
    public function callEnqueue(string $handle, string $src, string $type = 'script'): void {
        $this->enqueue_from_manifest($handle, $src, $type);
    }
}

final class AssetsTest extends TestCase {
    protected function setUp(): void { parent::setUp(); Monkey\setUp(); }
    protected function tearDown(): void { Monkey\tearDown(); parent::tearDown(); }

    public function test_script_entry_also_enqueues_its_css_siblings(): void {
        Functions\when('get_template_directory_uri')->justReturn('https://example.test/wp-content/themes/t');
        Functions\when('get_template_directory')->justReturn('/srv/themes/t');
        // file_exists is a PHP internal — can't be mocked via Brain Monkey without patchwork config.
        // '/srv/themes/t/dist/...' doesn't exist on this machine, so it naturally returns false,
        // triggering the '1.0.0' version fallback. No mock needed.
        $assets = new FakeManifestAssets();
        $assets->fakeManifest = array(
            'src/js/main.ts' => array(
                'file' => 'js/main.ABC.js',
                'css'  => array('css/main.DEF.css'),
            ),
        );

        Functions\expect('wp_enqueue_script')->once()
            ->with('stratawp-main', 'https://example.test/wp-content/themes/t/dist/js/main.ABC.js', array(), '1.0.0', true);
        Functions\expect('wp_enqueue_style')->once()
            ->with('stratawp-main-0', 'https://example.test/wp-content/themes/t/dist/css/main.DEF.css', array(), '1.0.0');

        $assets->callEnqueue('stratawp-main', 'src/js/main.ts', 'script');
    }
}
