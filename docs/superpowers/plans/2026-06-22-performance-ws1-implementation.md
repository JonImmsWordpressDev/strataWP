# Performance WS1 — Implementation Plan (PHP perf that actually fires)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make `packages/core`'s performance behavior real on the rendered page — fix the bug that drops the theme's own CSS, make non-critical CSS non-render-blocking, add responsive `sizes`, real async/defer, PWA precache, and consolidated resource hints — all unit-tested with Brain Monkey.

**Architecture:** All changes are in the `stratawp/core` PHP package and its PHPUnit suite. We port two mechanisms from the comparison target (codename **Triple XXX**, cloned at `/tmp/repo-analysis/wprig`): the CSS `rel=preload … onload="this.rel='stylesheet'"` swap (`inc/Styles/Component.php`) and responsive `sizes` filters (`inc/Image_Sizes/Component.php`). The main stylesheet stays render-blocking (async-ing it without critical CSS causes FOUC — that pairs with WS3). The Vite-side removal of orphaned generated PHP is **WS2** (it lives in `packages/vite-plugin`).

**Tech Stack:** PHP 8.1+, WordPress hooks, PHPUnit 10 + Brain Monkey 2.7 (already set up in `packages/core` from Phase 1).

**Spec:** `docs/superpowers/specs/2026-06-22-performance-design.md` (WS1). **Branch:** `feat/performance`.

**Conventions:**

- All paths under `packages/core`. Run PHP commands from `packages/core` (e.g. `composer test`, `composer phpcs`).
- Tests live in `packages/core/tests/Unit/`. Follow the existing Brain Monkey pattern (see `tests/Unit/UpdatesTest.php`): `Monkey\setUp()`/`tearDown()`, `Brain\Monkey\Functions\when(...)->justReturn(...)`, `Brain\Monkey\Filters\expectAdded(...)`, `Brain\Monkey\Actions\expectAdded(...)`.
- After each task: `composer test` green, then `composer phpcs` (auto-`phpcbf` mechanical issues), then commit. The Phase-1 CI gate must stay green.
- WordPress-style long-array syntax (WPCS) — match existing code in the file.

---

## Task 1: Fix the dropped-CSS bug in Assets

**Problem:** `Assets::enqueue_from_manifest()` only enqueues a manifest entry's `css[]` siblings in the **style** branch. The main bundle is enqueued as a **script** (`enqueue_from_manifest('stratawp-main','src/js/main.ts')`), so its `css[]` (the compiled `dist/css/main.*.css`) is never enqueued — the theme ships JS but not its own CSS.

**Files:**

- Modify: `src/Components/Assets.php` (the `'script'` branch of `enqueue_from_manifest`, ~lines 105-117)
- Test: `tests/Unit/AssetsTest.php` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/AssetsTest.php`. Use a subclass to inject a fake manifest (mirrors `ExposedUpdates` in `UpdatesTest`):

```php
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
        Functions\when('file_exists')->justReturn(false); // forces version fallback, no real fs
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
```

- [ ] **Step 2: Run it, confirm it FAILS** (the css sibling is not enqueued yet)

Run: `cd packages/core && composer test -- --filter AssetsTest`
Expected: FAIL — `wp_enqueue_style` expected once but called 0 times.

- [ ] **Step 3: Implement — enqueue css[] in the script branch**

In `src/Components/Assets.php`, change the `'script'` branch so a script entry also enqueues its associated CSS. Replace:

```php
		if ( 'script' === $type ) {
			wp_enqueue_script( $handle, $url, $deps, $version, true );
		} else {
```

with:

```php
		if ( 'script' === $type ) {
			wp_enqueue_script( $handle, $url, $deps, $version, true );

			// Vite splits an entry's CSS into the entry's `css` array; enqueue it
			// so the compiled stylesheet actually loads (it is not a separate
			// manifest key).
			if ( ! empty( $entry['css'] ) ) {
				foreach ( $entry['css'] as $index => $css_file ) {
					$css_url = get_template_directory_uri() . '/dist/' . $css_file;
					wp_enqueue_style( $handle . '-' . $index, $css_url, array(), $version );
				}
			}
		} else {
```

- [ ] **Step 4: Run it, confirm PASS**

Run: `cd packages/core && composer test -- --filter AssetsTest`
Expected: PASS.

- [ ] **Step 5: phpcs + commit**

```bash
cd packages/core && composer phpcbf || true && composer phpcs
git add packages/core/src/Components/Assets.php packages/core/tests/Unit/AssetsTest.php
git commit -m "fix(core): enqueue a script entry's CSS siblings so the theme stylesheet loads"
```

---

## Task 2: Make non-critical conditional CSS non-render-blocking (ConditionalStyles)

**Problem:** `ConditionalStyles::enqueue_styles()` _enqueues_ every conditional sheet (render-blocking) and `preload_styles()` adds a plain `rel=preload` with no `onload` swap — so sheets are both render-blocking AND redundantly preloaded. Port the Triple XXX pattern (`/tmp/repo-analysis/wprig/inc/Styles/Component.php`): **register** (don't enqueue) non-global sheets, then emit `rel=preload as=style onload="this.rel='stylesheet'"` with a `<noscript>` fallback. Add `precache` data.

**Files:**

- Modify: `src/Components/ConditionalStyles.php` (`enqueue_styles`, `preload_styles`; extend `get_css_files` entries with a `global` default)
- Test: `tests/Unit/ConditionalStylesTest.php` (create)

- [ ] **Step 1: Write the failing tests**

Create `tests/Unit/ConditionalStylesTest.php`:

```php
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
        Functions\when('file_exists')->justReturn(true);
        Functions\when('filemtime')->justReturn(123);
        Functions\when('apply_filters')->returnArg(2); // return the unfiltered value
        Functions\when('is_singular')->justReturn(true);
        Functions\when('comments_open')->justReturn(true);
        Functions\when('is_active_sidebar')->justReturn(false);

        // Non-global conditional sheets must be REGISTERED, never enqueued.
        Functions\expect('wp_register_style')->atLeast()->once();
        Functions\expect('wp_enqueue_style')->never();
        Functions\when('wp_style_add_data')->justReturn(true);

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
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd packages/core && composer test -- --filter ConditionalStylesTest`
Expected: FAIL (current code enqueues instead of registers; preload has no `onload`).

- [ ] **Step 3: Implement the register + onload-swap pattern**

In `src/Components/ConditionalStyles.php`:

(a) In `get_css_files()`, ensure each returned entry has a `global` key default. After building `$css_files` (before the `apply_filters` return), the entries currently lack `global`; add it. Replace the `return apply_filters( 'stratawp_conditional_css_files', $css_files );` with:

```php
		$css_files = apply_filters( 'stratawp_conditional_css_files', $css_files );

		$normalized = array();
		foreach ( $css_files as $handle => $data ) {
			$normalized[ $handle ] = array_merge(
				array(
					'global'           => false,
					'preload_callback' => null,
				),
				$data
			);
		}

		return $normalized;
```

(b) Rewrite `enqueue_styles()` so non-global sheets are **registered** (not enqueued), global sheets are enqueued, and all get `precache` data:

```php
	public function enqueue_styles(): void {
		$css_files = $this->get_css_files();
		$css_dir   = get_template_directory() . '/dist/css/';
		$css_uri   = get_template_directory_uri() . '/dist/css/';

		foreach ( $css_files as $handle => $data ) {
			$file_path = $css_dir . $data['file'];

			if ( ! file_exists( $file_path ) ) {
				continue;
			}

			$version = (string) filemtime( $file_path );
			$src     = $css_uri . $data['file'];

			if ( ! empty( $data['global'] ) ) {
				wp_enqueue_style( $handle, $src, array(), $version );
			} else {
				// Register only; preload_styles() injects it asynchronously.
				wp_register_style( $handle, $src, array(), $version );
			}

			wp_style_add_data( $handle, 'precache', true );
		}
	}
```

(c) Rewrite `preload_styles()` to emit the onload swap + `<noscript>` fallback:

```php
	public function preload_styles(): void {
		if ( ! apply_filters( 'stratawp_preloading_styles_enabled', true ) ) {
			return;
		}

		$wp_styles = wp_styles();
		$css_files = $this->get_css_files();

		foreach ( $css_files as $handle => $data ) {
			if ( ! empty( $data['global'] ) ) {
				continue;
			}

			if ( ! isset( $data['preload_callback'] ) || ! is_callable( $data['preload_callback'] ) ) {
				continue;
			}

			if ( ! call_user_func( $data['preload_callback'] ) ) {
				continue;
			}

			if ( ! isset( $wp_styles->registered[ $handle ] ) ) {
				continue;
			}

			$href = $wp_styles->registered[ $handle ]->src . '?ver=' . $wp_styles->registered[ $handle ]->ver;

			printf(
				'<link rel="preload" id="%1$s-preload" href="%2$s" as="style" onload="this.rel=\'stylesheet\'">' . "\n",
				esc_attr( $handle ),
				esc_url( $href )
			);
			printf(
				'<noscript><link rel="stylesheet" href="%s"></noscript>' . "\n",
				esc_url( $href )
			);
		}
	}
```

- [ ] **Step 4: Run, confirm PASS**

Run: `cd packages/core && composer test -- --filter ConditionalStylesTest`
Expected: PASS.

- [ ] **Step 5: phpcs + commit**

```bash
cd packages/core && composer phpcbf || true && composer phpcs
git add packages/core/src/Components/ConditionalStyles.php packages/core/tests/Unit/ConditionalStylesTest.php
git commit -m "feat(core): non-render-blocking conditional CSS via preload/onload swap + precache"
```

---

## Task 3: Ship ConditionalStyles + a new ImageSizes component by default

**Files:**

- Create: `src/Components/ImageSizes.php`
- Modify: `src/Theme.php` (`get_default_components`)
- Test: `tests/Unit/ImageSizesTest.php` (create), `tests/Unit/ThemeDefaultsTest.php` (create)

- [ ] **Step 1: Write the ImageSizes failing test**

Create `tests/Unit/ImageSizesTest.php`:

```php
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
```

- [ ] **Step 2: Run, confirm FAIL** (class doesn't exist)

Run: `cd packages/core && composer test -- --filter ImageSizesTest`
Expected: FAIL (class not found).

- [ ] **Step 3: Implement ImageSizes** (port of Triple XXX `inc/Image_Sizes/Component.php`, using `is_active_sidebar('sidebar-1')`)

Create `src/Components/ImageSizes.php`:

```php
<?php
/**
 * Image Sizes Component
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Responsive image `sizes` tuning for better LCP/CLS.
 */
class ImageSizes implements ComponentInterface {

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'image-sizes';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_filter( 'wp_calculate_image_sizes', array( $this, 'filter_content_image_sizes_attr' ), 10, 2 );
		add_filter( 'wp_get_attachment_image_attributes', array( $this, 'filter_post_thumbnail_sizes_attr' ), 10, 3 );
	}

	/**
	 * Tune the `sizes` attribute for content images.
	 *
	 * @param string $sizes A source size value for a 'sizes' attribute.
	 * @param array  $size  Image size [ width, height ] in pixels.
	 * @return string
	 */
	public function filter_content_image_sizes_attr( string $sizes, array $size ): string {
		$width = $size[0] ?? 0;

		if ( 740 <= $width ) {
			$sizes = '100vw';
		}

		if ( is_active_sidebar( 'sidebar-1' ) ) {
			$sizes = '(min-width: 960px) 75vw, 100vw';
		}

		return $sizes;
	}

	/**
	 * Tune the `sizes` attribute for post thumbnails.
	 *
	 * @param array $attr Attributes for the image markup.
	 * @return array
	 */
	public function filter_post_thumbnail_sizes_attr( array $attr ): array {
		$attr['sizes'] = is_active_sidebar( 'sidebar-1' )
			? '(min-width: 960px) 75vw, 100vw'
			: '100vw';

		return $attr;
	}
}
```

(Note: signature kept to one required param plus WP's extra args are ignored — WordPress passes 3 args but PHP tolerates extra args to a method declaring fewer.)

- [ ] **Step 4: Add both components to the defaults + test**

In `src/Theme.php` `get_default_components()`, add `ConditionalStyles` and `ImageSizes`:

```php
	protected function get_default_components(): array {
		return array(
			new Components\Setup(),
			new Components\Assets(),
			new Components\Blocks(),
			new Components\Performance(),
			new Components\Accessibility(),
			new Components\ConditionalStyles(),
			new Components\ImageSizes(),
		);
	}
```

Create `tests/Unit/ThemeDefaultsTest.php`:

```php
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
    }
}
```

- [ ] **Step 5: Run, confirm PASS**

Run: `cd packages/core && composer test -- --filter "ImageSizesTest|ThemeDefaultsTest"`
Expected: PASS.

- [ ] **Step 6: phpcs + commit**

```bash
cd packages/core && composer phpcbf || true && composer phpcs
git add packages/core/src/Components/ImageSizes.php packages/core/src/Theme.php packages/core/tests/Unit/ImageSizesTest.php packages/core/tests/Unit/ThemeDefaultsTest.php
git commit -m "feat(core): responsive image sizes component + ship it and ConditionalStyles by default"
```

---

## Task 4: Real async (not just defer) for scripts

**Files:**

- Modify: `src/Components/Performance.php` (`add_async_defer`)
- Test: `tests/Unit/PerformanceTest.php` (create)

- [ ] **Step 1: Write the failing tests**

Create `tests/Unit/PerformanceTest.php`:

```php
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
```

- [ ] **Step 2: Run, confirm FAIL** (async not implemented)

Run: `cd packages/core && composer test -- --filter PerformanceTest`
Expected: FAIL on the async test.

- [ ] **Step 3: Implement async + defer**

In `src/Components/Performance.php`, replace `add_async_defer`:

```php
	public function add_async_defer( string $tag, string $handle, string $src ): string {
		$async_scripts = apply_filters( 'stratawp_async_scripts', array() );
		if ( in_array( $handle, $async_scripts, true ) ) {
			return str_replace( '<script ', '<script async ', $tag );
		}

		$defer_scripts = apply_filters( 'stratawp_defer_scripts', array( 'stratawp-main' ) );
		if ( in_array( $handle, $defer_scripts, true ) ) {
			return str_replace( '<script ', '<script defer ', $tag );
		}

		return $tag;
	}
```

- [ ] **Step 4: Run, confirm PASS**

Run: `cd packages/core && composer test -- --filter PerformanceTest`
Expected: PASS.

- [ ] **Step 5: phpcs + commit**

```bash
cd packages/core && composer phpcbf || true && composer phpcs
git add packages/core/src/Components/Performance.php packages/core/tests/Unit/PerformanceTest.php
git commit -m "feat(core): support async scripts via stratawp_async_scripts filter (not just defer)"
```

---

## Task 5: PWA precache flags on main assets

**Files:**

- Modify: `src/Components/Assets.php` (`enqueue_from_manifest` — add precache data after enqueue)
- Test: extend `tests/Unit/AssetsTest.php`

- [ ] **Step 1: Add a failing test** to `AssetsTest.php`

```php
    public function test_script_and_css_get_precache_data(): void {
        Functions\when('get_template_directory_uri')->justReturn('https://example.test/t');
        Functions\when('get_template_directory')->justReturn('/srv/t');
        Functions\when('file_exists')->justReturn(false);
        Functions\when('wp_enqueue_script')->justReturn(null);
        Functions\when('wp_enqueue_style')->justReturn(null);
        $assets = new FakeManifestAssets();
        $assets->fakeManifest = array(
            'src/js/main.ts' => array('file' => 'js/main.ABC.js', 'css' => array('css/main.DEF.css')),
        );
        Functions\expect('wp_script_add_data')->once()->with('stratawp-main', 'precache', true);
        Functions\expect('wp_style_add_data')->once()->with('stratawp-main-0', 'precache', true);

        $assets->callEnqueue('stratawp-main', 'src/js/main.ts', 'script');
    }
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `cd packages/core && composer test -- --filter AssetsTest`
Expected: FAIL (precache data not added).

- [ ] **Step 3: Implement** — in the `'script'` branch of `enqueue_from_manifest`, after `wp_enqueue_script(...)` add `wp_script_add_data( $handle, 'precache', true );`, and inside the css loop after `wp_enqueue_style(...)` add `wp_style_add_data( $handle . '-' . $index, 'precache', true );`. In the `else` (style) branch, after `wp_enqueue_style( $handle, ... )` add `wp_style_add_data( $handle, 'precache', true );` and the same inside its css loop.

- [ ] **Step 4: Run, confirm PASS** — `cd packages/core && composer test -- --filter AssetsTest` → PASS.

- [ ] **Step 5: phpcs + commit**

```bash
cd packages/core && composer phpcbf || true && composer phpcs
git add packages/core/src/Components/Assets.php packages/core/tests/Unit/AssetsTest.php
git commit -m "feat(core): mark enqueued assets as precache for service-worker caching"
```

---

## Task 6: Reconcile docs + full verification

**Files:**

- Modify: `CLAUDE.md` (the `Performance` / default-components descriptions)
- (No code change — verification task)

- [ ] **Step 1: Update CLAUDE.md** so the component descriptions match reality:
  - `Performance`: "resource hints (filter-driven), async/defer scripts, WP bloat removal" (NOT "critical CSS, lazy loading").
  - Add `ConditionalStyles` and `ImageSizes` to the default-components list, with one-line accurate descriptions (non-render-blocking conditional CSS; responsive `sizes`).
  - Remove/repoint any claim that the `Performance` component does critical CSS or lazy loading.

- [ ] **Step 2: Full PHP gate**

Run:

```bash
cd packages/core && composer phpcs && composer phpstan && composer test
```

Expected: all exit 0. (If PHPStan flags the new files, fix types or extend the baseline minimally with a `ratchet` note.)

- [ ] **Step 3: Full repo gate (as CI runs it)**

Run from repo root:

```bash
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

Expected: all exit 0. (`format:check` covers `CLAUDE.md` — run `pnpm format` if it flags the edit.)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: align core component descriptions with actual performance behavior"
```

---

## Self-Review

**Spec coverage (WS1):** CSS enqueue bug → Task 1 · async/non-render-blocking CSS → Task 2 · ship ConditionalStyles by default → Task 3 · responsive `sizes` → Task 3 (ImageSizes) · async+defer → Task 4 · precache → Task 5 · consolidate resource hints → handled by deleting the duplicate generated PHP in **WS2** (Performance.php is already the single filter-driven source; no core change needed now) · doc reconciliation → Task 6.

**Deferred to WS2 (vite-plugin):** removing the orphaned `preload-generated.php` / `lazy-loading-generated.php` generation, and the image pipeline. **Deferred to WS3:** async-ing the _main_ stylesheet (needs critical CSS to avoid FOUC).

**Placeholder scan:** none — every step has concrete code/commands. **Type consistency:** `get_slug()` returns `image-sizes`; filter names `stratawp_async_scripts`/`stratawp_defer_scripts`/`stratawp_preloading_styles_enabled`/`stratawp_conditional_css_files` match usage; handle suffix `-{index}` matches Assets.
