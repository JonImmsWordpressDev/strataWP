<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Updates;

final class ExposedUpdates extends Updates {
    public function callFindZipAsset(array $assets): ?string {
        return $this->find_zip_asset($assets);
    }
}

final class UpdatesTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function test_get_slug_returns_updates(): void {
        $this->assertSame('updates', (new Updates('owner/repo'))->get_slug());
    }

    public function test_initialize_with_empty_repository_registers_no_hooks(): void {
        Filters\expectAdded('pre_set_site_transient_update_themes')->never();
        Actions\expectAdded('admin_notices')->never();

        (new Updates(''))->initialize();
    }

    public function test_initialize_registers_update_hooks_when_repo_set(): void {
        Filters\expectAdded('pre_set_site_transient_update_themes')->once();
        Filters\expectAdded('themes_api')->once();
        Actions\expectAdded('admin_notices')->once();
        Filters\expectAdded('upgrader_pre_download')->once();

        (new Updates('owner/repo'))->initialize();
    }

    public function test_find_zip_asset_prefers_configured_asset_name(): void {
        $updates = new ExposedUpdates('owner/repo', 'my-theme.zip');
        $assets = [
            ['name' => 'other.zip', 'url' => 'https://api/other'],
            ['name' => 'my-theme.zip', 'url' => 'https://api/wanted'],
        ];
        $this->assertSame('https://api/wanted', $updates->callFindZipAsset($assets));
    }

    public function test_find_zip_asset_falls_back_to_any_zip(): void {
        $updates = new ExposedUpdates('owner/repo');
        $assets = [
            ['name' => 'notes.txt', 'url' => 'https://api/txt'],
            ['name' => 'build.zip', 'url' => 'https://api/zip'],
        ];
        $this->assertSame('https://api/zip', $updates->callFindZipAsset($assets));
    }

    public function test_find_zip_asset_returns_null_when_no_zip_present(): void {
        $updates = new ExposedUpdates('owner/repo');
        $assets = [['name' => 'notes.txt', 'url' => 'https://api/txt']];
        $this->assertNull($updates->callFindZipAsset($assets));
    }

    public function test_find_zip_asset_returns_null_for_empty_assets(): void {
        $updates = new ExposedUpdates('owner/repo');
        $this->assertNull($updates->callFindZipAsset([]));
    }
}
