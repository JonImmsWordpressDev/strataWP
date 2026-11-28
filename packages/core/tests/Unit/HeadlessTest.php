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
    if (!class_exists('WP_Post')) {
        // Plain property bag, like WordPress's final WP_Post.
        final class WP_Post {
            public int $ID = 0;
            public string $post_type = 'post';
            public string $post_status = 'publish';
            public string $post_name = '';
            public string $post_title = '';
            public function __construct(array $props = []) {
                foreach ($props as $key => $value) { $this->$key = $value; }
            }
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
    private const SECRET = 'test-secret';

    // Same vector as packages/headless/src/utils/__tests__/signing.test.ts, so
    // both sides agree on the token format.
    private const VECTOR_PAYLOAD = ['id' => 42, 'type' => 'post', 'path' => '/hello-world/', 'exp' => 2000000000];
    private const VECTOR_TOKEN = 'eyJpZCI6NDIsInR5cGUiOiJwb3N0IiwicGF0aCI6Ii9oZWxsby13b3JsZC8iLCJleHAiOjIwMDAwMDAwMDB9.AyThuIdOtG2wF6uzsGd6H2uqSQa8fSIvEJ3Gxqw2gig';

    private static function connected(): Headless {
        return new Headless('https://front.example.com/', self::SECRET);
    }

    private function stubPermalinks(): void {
        Functions\when('wp_json_encode')->alias(static fn($data) => json_encode($data, JSON_UNESCAPED_SLASHES));
        Functions\when('sanitize_title')->alias(static fn(string $t): string => strtolower(trim((string) preg_replace('/[^a-z0-9]+/i', '-', $t), '-')));
        Functions\when('get_permalink')->alias(static fn(\WP_Post $p): string => 'http://wp.example.com/' . $p->post_name . '/');
        Functions\when('wp_make_link_relative')->alias(static fn(string $url): string => (string) preg_replace('#^https?://[^/]+#', '', $url));
        Functions\when('get_post_types')->justReturn(['post' => 'post', 'page' => 'page']);
    }

    public function test_not_connected_adds_no_preview_or_webhook_hooks(): void {
        Actions\expectAdded('rest_api_init')->twice();
        Filters\expectAdded('preview_post_link')->never();
        Actions\expectAdded('transition_post_status')->never();
        (new Headless('https://front.example.com', ''))->initialize();
        (new Headless('', self::SECRET))->initialize();
        $this->addToAssertionCount(1);
    }

    public function test_connected_adds_preview_and_webhook_hooks(): void {
        Filters\expectAdded('preview_post_link')->once();
        Actions\expectAdded('transition_post_status')->once();
        self::connected()->initialize();
        $this->addToAssertionCount(1);
    }

    public function test_token_matches_shared_vector(): void {
        Functions\when('wp_json_encode')->alias(static fn($data) => json_encode($data, JSON_UNESCAPED_SLASHES));
        $this->assertSame(self::VECTOR_TOKEN, self::connected()->sign_token(self::VECTOR_PAYLOAD));
    }

    public function test_token_round_trip_and_rejections(): void {
        Functions\when('wp_json_encode')->alias(static fn($data) => json_encode($data, JSON_UNESCAPED_SLASHES));
        $headless = self::connected();
        $token = $headless->sign_token(['id' => 1, 'exp' => 1000]);

        $this->assertSame(['id' => 1, 'exp' => 1000], $headless->verify_token($token, 999));
        $this->assertNull($headless->verify_token($token, 1001), 'expired');
        $this->assertNull((new Headless('https://front.example.com', 'other'))->verify_token($token, 999), 'wrong secret');
        $this->assertNull($headless->verify_token($token . 'x', 999), 'tampered signature');
        $this->assertNull($headless->verify_token('nodot', 999));
    }

    public function test_preview_link_points_at_frontend_draft_route(): void {
        $this->stubPermalinks();
        $post = new \WP_Post(['ID' => 9, 'post_type' => 'post', 'post_status' => 'draft', 'post_title' => 'My Draft']);

        $link = self::connected()->filter_preview_link('http://wp.example.com/?p=9&preview=true', $post);

        $this->assertStringStartsWith('https://front.example.com/api/draft?token=', $link);
        parse_str((string) parse_url($link, PHP_URL_QUERY), $query);
        $claims = self::connected()->verify_token($query['token']);
        $this->assertSame(9, $claims['id']);
        $this->assertSame('post', $claims['type']);
        $this->assertSame('/my-draft/', $claims['path']);
        $this->assertGreaterThan(time(), $claims['exp']);
    }

    public function test_preview_link_untouched_for_other_post_types(): void {
        $this->stubPermalinks();
        $post = new \WP_Post(['ID' => 3, 'post_type' => 'wp_template']);
        $this->assertSame('orig', self::connected()->filter_preview_link('orig', $post));
    }

    public function test_preview_path_is_filterable(): void {
        $this->stubPermalinks();
        Filters\expectApplied('stratawp_headless_preview_path')->once()->andReturn('/preview');
        $link = self::connected()->filter_preview_link('orig', new \WP_Post(['ID' => 1, 'post_name' => 'a']));
        $this->assertStringStartsWith('https://front.example.com/preview?token=', $link);
    }

    public function test_transition_events(): void {
        $this->assertSame('publish', Headless::transition_event('publish', 'draft'));
        $this->assertSame('publish', Headless::transition_event('publish', 'future'));
        $this->assertSame('update', Headless::transition_event('publish', 'publish'));
        $this->assertSame('unpublish', Headless::transition_event('draft', 'publish'));
        $this->assertSame('unpublish', Headless::transition_event('private', 'publish'));
        $this->assertSame('trash', Headless::transition_event('trash', 'publish'));
        $this->assertNull(Headless::transition_event('draft', 'draft'));
        $this->assertNull(Headless::transition_event('trash', 'draft'));
        $this->assertNull(Headless::transition_event('future', 'draft'));
    }

    public function test_trashed_post_webhook_carries_public_slug_and_signature(): void {
        $this->stubPermalinks();
        Functions\when('wp_is_post_revision')->justReturn(false);
        Functions\when('wp_is_post_autosave')->justReturn(false);
        $sent = null;
        Functions\expect('wp_remote_post')->once()->andReturnUsing(static function ($url, $args) use (&$sent) {
            $sent = [$url, $args];
            return [];
        });
        $post = new \WP_Post(['ID' => 5, 'post_type' => 'page', 'post_status' => 'trash', 'post_name' => 'about__trashed']);

        self::connected()->on_transition('trash', 'publish', $post);

        [$url, $args] = $sent;
        $this->assertSame('https://front.example.com/api/revalidate', $url);
        $this->assertFalse($args['blocking']);
        $body = json_decode($args['body'], true);
        $this->assertSame('trash', $body['event']);
        $this->assertSame(5, $body['id']);
        $this->assertSame('page', $body['type']);
        $this->assertSame('about', $body['slug']);
        $this->assertSame('/about/', $body['path']);
        $this->assertIsInt($body['timestamp']);
        $this->assertSame('sha256=' . hash_hmac('sha256', $args['body'], self::SECRET), $args['headers']['X-StrataWP-Signature']);
    }

    public function test_draft_saves_and_revisions_send_nothing(): void {
        $this->stubPermalinks();
        Functions\when('wp_is_post_autosave')->justReturn(false);
        Functions\when('wp_is_post_revision')->alias(static fn(\WP_Post $p) => 'revision' === $p->post_type ? 1 : false);
        Functions\expect('wp_remote_post')->never();

        self::connected()->on_transition('draft', 'draft', new \WP_Post(['ID' => 1, 'post_name' => 'a']));
        self::connected()->on_transition('inherit', 'new', new \WP_Post(['ID' => 2, 'post_type' => 'revision']));
        self::connected()->on_transition('publish', 'draft', new \WP_Post(['ID' => 3, 'post_type' => 'wp_navigation']));
        $this->addToAssertionCount(1);
    }
}

}
