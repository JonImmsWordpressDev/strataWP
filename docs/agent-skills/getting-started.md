# Getting Started with WordPress Agent Skills

This guide walks you through using WordPress agent skills in your StrataWP theme development workflow.

## Prerequisites

- StrataWP theme (created with `npx create-stratawp`)
- Claude Code or Claude with access to the `.claude/skills/` directory
- Node.js 18+ (for running inspection scripts)
- Optional: WP-CLI for performance and operations skills

## First Steps

### 1. Verify Skills Are Available

Skills are located in your theme's `.claude/skills/` directory:

```bash
ls .claude/skills/
```

You should see:

```
wordpress-router/
wp-block-development/
wp-block-themes/
wp-interactivity-api/
wp-performance/
wp-phpstan/
wp-plugin-development/
wp-project-triage/
wp-rest-api/
wp-wpcli-and-ops/
```

### 2. Run Project Triage

Before starting any work, run the triage script to understand your project:

```bash
node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs
```

This outputs JSON describing your project:

```json
{
  "project": {
    "kind": ["block-theme"],
    "root": "/path/to/theme"
  },
  "signals": {
    "hasThemeJson": true,
    "hasBlockJson": true,
    "usesInteractivityApi": false
  },
  "tooling": {
    "hasComposer": true,
    "hasNodePackages": true,
    "usesWordPressScripts": false,
    "usesVite": true
  },
  "tests": {
    "hasPhpUnit": false,
    "hasPlaywright": true
  }
}
```

### 3. Understand the Workflow Pattern

All skills follow a consistent pattern:

```
1. TRIAGE   → Understand the project structure
2. ROUTE    → Select the right skill for the task
3. PREPARE  → Read relevant references
4. EXECUTE  → Follow the skill's procedure
5. VERIFY   → Run the skill's verification steps
```

## Working with Claude

When using Claude Code with StrataWP, skills are automatically available. Here's how to leverage them effectively:

### Invoke Skills Naturally

Just describe what you want to do. Claude will select the appropriate skill:

**Example prompts:**

- "Create a new hero block with a title and background image"
  → Uses `wp-block-development`

- "Add a sidebar template part for the blog"
  → Uses `wp-block-themes`

- "The site is loading slowly, help me profile it"
  → Uses `wp-performance`

- "Set up a REST endpoint for custom testimonials"
  → Uses `wp-rest-api`

### Reference Skills Explicitly

You can also reference skills directly:

- "Using the wp-block-development skill, create a testimonial block"
- "Follow wp-performance procedures to profile the homepage"

### Check Skill References

Each skill has reference documentation for deep dives:

```
.claude/skills/wp-block-development/references/
├── deprecations.md
├── inner-blocks.md
├── block-json.md
└── ...
```

## Skill-Specific Setup

### For Block Development

Ensure your theme has the block structure:

```
src/blocks/
├── hero/
│   ├── block.json
│   ├── index.tsx
│   ├── save.tsx
│   └── style.scss
└── testimonial/
    └── ...
```

The Vite plugin automatically registers blocks from this structure.

### For Performance Profiling

Install WP-CLI with the doctor and profile commands:

```bash
# Install WP-CLI (if not already installed)
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# Install profile command
wp package install wp-cli/profile-command

# Install doctor command
wp package install wp-cli/doctor-command
```

### For PHPStan

Add WordPress stubs to your project:

```bash
composer require --dev szepeviktor/phpstan-wordpress
```

Create `phpstan.neon`:

```neon
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon

parameters:
    level: 5
    paths:
        - inc/
        - functions.php
    excludePaths:
        - vendor/
```

## Common Workflows

### Creating a New Block

1. **Triage**: Verify project supports blocks

   ```bash
   node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs
   ```

2. **Scaffold**: Use StrataWP CLI

   ```bash
   stratawp block:new testimonial --styleFramework=tailwind
   ```

3. **Develop**: Follow `wp-block-development` procedures
   - Use `apiVersion: 3` in block.json
   - Implement `render.php` for dynamic content
   - Add deprecations when changing attributes

4. **Verify**: Build and test
   ```bash
   pnpm build
   pnpm test
   ```

### Optimizing Performance

1. **Baseline**: Capture current state

   ```bash
   wp profile stage --url=https://your-site.test/
   ```

2. **Identify**: Find bottlenecks

   ```bash
   wp profile hook --url=https://your-site.test/ --spotlight
   ```

3. **Fix**: Apply targeted optimizations
   - Use references in `.claude/skills/wp-performance/references/`

4. **Verify**: Compare before/after
   ```bash
   wp profile stage --url=https://your-site.test/
   ```

### Adding REST Endpoints

1. **Plan**: Define namespace and routes
   - Namespace: `mytheme/v1`
   - Routes: `/testimonials`, `/testimonials/(?P<id>\d+)`

2. **Implement**: Follow `wp-rest-api` patterns
   - Use `register_rest_route()` on `rest_api_init`
   - Always include `permission_callback`
   - Return errors via `WP_Error` with status

3. **Verify**: Test endpoints
   ```bash
   curl https://your-site.test/wp-json/mytheme/v1/testimonials
   ```

## Troubleshooting

### Scripts Not Running

Ensure Node.js 18+ is installed:

```bash
node --version  # Should be 18.x or higher
```

### WP-CLI Commands Missing

Install required packages:

```bash
wp package install wp-cli/profile-command
wp package install wp-cli/doctor-command
```

### Skills Not Being Used

Make sure you're in the correct directory with `.claude/skills/` available.

## Next Steps

- [Cheat Sheet](./cheat-sheet.md) - Quick reference for common tasks
- [Use Cases](./use-cases.md) - Real-world examples and scenarios
- Individual skill documentation in `.claude/skills/[skill-name]/SKILL.md`
