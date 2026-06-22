<?php
/**
 * PHPUnit bootstrap for StrataWP core unit tests.
 *
 * Defines the WordPress time constants that component classes reference in
 * property defaults (e.g. Updates::$cache_ttl = 6 * HOUR_IN_SECONDS), then
 * loads Composer's autoloader. WordPress functions themselves are mocked
 * per-test via Brain Monkey.
 */

declare(strict_types=1);

if (!defined('MINUTE_IN_SECONDS')) {
    define('MINUTE_IN_SECONDS', 60);
}
if (!defined('HOUR_IN_SECONDS')) {
    define('HOUR_IN_SECONDS', 60 * MINUTE_IN_SECONDS);
}
if (!defined('DAY_IN_SECONDS')) {
    define('DAY_IN_SECONDS', 24 * HOUR_IN_SECONDS);
}

require_once dirname(__DIR__) . '/vendor/autoload.php';
