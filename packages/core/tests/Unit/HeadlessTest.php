<?php

declare(strict_types=1);

namespace {
    if (!class_exists('WP_Block_Type_Registry')) {
        // Minimal stand-in for WordPress's registry: tests set $types directly.
        final class WP_Block_Type_Registry {
            public static array $types = [];
            private static ?self $instance = null;
            public static function get_instance(): self { return self::$instance ??= new self(); }
            public function get_registered(string $name) { return self::$types[$name] ?? null; }
        }
    }
}

namespace StrataWP\Tests\Unit {

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Headless;

final class HeadlessTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
        \WP_Block_Type_Registry::$types = [];
        Functions\when('render_block')->alias(static fn(array $b): string => 'html:' . ($b['blockName'] ?? 'null'));
    }

    protected function tearDown(): void { Monkey\tearDown(); parent::tearDown(); }

    private static function block(?string $name, array $attrs = [], array $inner = [], string $html = '<p>x</p>'): array {
        return ['blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $inner, 'innerHTML' => $html, 'innerContent' => [$html]];
    }

    public function test_slug(): void {
        $this->assertSame('headless', (new Headless())->get_slug());
    }

    public function test_initialize_hooks_rest_api_init(): void {
        Actions\expectAdded('rest_api_init')->once();
        (new Headless())->initialize();
        $this->addToAssertionCount(1);
    }

    public function test_not_a_default_component(): void {
        Functions\when('apply_filters')->returnArg(2);
        $this->assertArrayNotHasKey('headless', (new \StrataWP\Theme())->components());
    }

    public function test_post_types_skip_attachments_and_internal_types(): void {
        Functions\when('get_post_types')->justReturn([
            'post' => 'post', 'page' => 'page', 'attachment' => 'attachment',
            'wp_block' => 'wp_block', 'wp_template' => 'wp_template', 'project' => 'project',
        ]);
        $this->assertSame(['post', 'page', 'project'], (new Headless())->get_post_types());
    }

    public function test_registers_readonly_field_on_post_types(): void {
        Functions\when('get_post_types')->justReturn(['post' => 'post']);
        Functions\expect('register_rest_field')->once()->andReturnUsing(function ($types, $field, $args) {
            $this->assertSame(['post'], $types);
            $this->assertSame('blocks', $field);
            $this->assertTrue($args['schema']['readonly']);
            $this->assertIsCallable($args['get_callback']);
        });
        (new Headless())->register_rest_field();
    }

    public function test_field_shape_with_defaults_and_inner_blocks(): void {
        \WP_Block_Type_Registry::$types['strata-basic/hero'] = (object) [
            'attributes' => [
                'title' => ['type' => 'string', 'default' => 'Welcome'],
                'align' => ['type' => 'string', 'default' => 'full'],
                'url'   => ['type' => 'string'],
            ],
        ];
        $blocks = [
            self::block('strata-basic/hero', ['title' => 'Hi'], [self::block('core/paragraph')]),
            self::block(null, [], [], "\n\n"),
            self::block(null, [], [], '<p>classic</p>'),
        ];

        $out = (new Headless())->format_blocks($blocks);

        $this->assertCount(2, $out);
        $this->assertSame('strata-basic/hero', $out[0]['name']);
        $this->assertEquals((object) ['title' => 'Hi', 'align' => 'full'], $out[0]['attributes']);
        $this->assertSame('html:strata-basic/hero', $out[0]['rendered']);
        $this->assertCount(1, $out[0]['innerBlocks']);
        $this->assertSame('core/paragraph', $out[0]['innerBlocks'][0]['name']);
        $this->assertEquals(new \stdClass(), $out[0]['innerBlocks'][0]['attributes']);
        $this->assertSame([], $out[0]['innerBlocks'][0]['innerBlocks']);
        $this->assertSame('core/freeform', $out[1]['name']);
        $this->assertSame('{"name":"core\/freeform","attributes":{},"innerBlocks":[],"rendered":"html:null"}', json_encode($out[1]));
    }

    public function test_attribute_filter_can_drop_attributes(): void {
        Filters\expectApplied('stratawp_headless_block_attributes')
            ->once()
            ->andReturnUsing(static function (array $attrs, string $name): array {
                unset($attrs['secret']);
                return $attrs;
            });
        $out = (new Headless())->format_blocks([self::block('core/group', ['secret' => 'x', 'tagName' => 'div'])]);
        $this->assertEquals((object) ['tagName' => 'div'], $out[0]['attributes']);
    }

    public function test_password_protected_post_returns_nothing(): void {
        Functions\when('post_password_required')->justReturn(true);
        Functions\expect('get_post_field')->never();
        $this->assertSame([], (new Headless())->get_blocks_field(['id' => 7]));
    }

    public function test_field_parses_post_content(): void {
        Functions\when('post_password_required')->justReturn(false);
        Functions\when('get_post_field')->justReturn('<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph -->');
        Functions\when('parse_blocks')->justReturn([self::block('core/paragraph')]);
        $out = (new Headless())->get_blocks_field(['id' => 7]);
        $this->assertSame('core/paragraph', $out[0]['name']);
    }
}

}
