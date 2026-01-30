# Save as Pattern - Gutenberg Plugin Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Save as Pattern" button to WordPress Block Editor toolbar that saves selected blocks as a pattern.

**Architecture:** Gutenberg plugin using `@wordpress/plugins` and `@wordpress/block-editor` to add toolbar button with modal for saving patterns to the REST API.

**Tech Stack:** TypeScript, React, @wordpress/plugins, @wordpress/block-editor, @wordpress/data, @wordpress/components

---

## Prerequisites

**Worktree:** `/Users/jon.imms/Local Sites/stratawp/strataWP/.worktrees/phase2b-editor`
**Branch:** `phase2b-editor`

---

## Task 1: Create Save Pattern Plugin Structure

**Files:**
- Create: `packages/studio/src/gutenberg/save-pattern-plugin/index.tsx`
- Create: `packages/studio/src/gutenberg/save-pattern-plugin/SavePatternButton.tsx`
- Create: `packages/studio/src/gutenberg/save-pattern-plugin/SavePatternModal.tsx`

### Step 1: Create index.tsx (plugin registration)

```typescript
import { registerPlugin } from '@wordpress/plugins'
import { SavePatternButton } from './SavePatternButton'

registerPlugin('stratawp-save-pattern', {
  render: SavePatternButton,
})
```

### Step 2: Create SavePatternButton.tsx

- Use `useSelect` to check if blocks are selected
- Use `BlockControls` slot from `@wordpress/block-editor`
- Add ToolbarButton that opens SavePatternModal
- Only render when 1+ blocks selected

### Step 3: Create SavePatternModal.tsx

- Modal with TextControl for pattern name
- SelectControl for category (fetch from API)
- TextControl for tags (comma-separated)
- Save button that:
  - Gets selected blocks via `select('core/block-editor').getSelectedBlocks()`
  - Serializes via `wp.blocks.serialize()`
  - POSTs to `/stratawp/v1/patterns`
  - Shows success snackbar
  - Closes modal

### Step 4: Commit

```bash
git add packages/studio/src/gutenberg/
git commit -m "feat(studio): add Save Pattern Gutenberg plugin structure"
```

---

## Task 2: Implement SavePatternButton Component

**Files:**
- Modify: `packages/studio/src/gutenberg/save-pattern-plugin/SavePatternButton.tsx`

### Implementation

```typescript
import { useState } from '@wordpress/element'
import { useSelect } from '@wordpress/data'
import { BlockControls } from '@wordpress/block-editor'
import { ToolbarGroup, ToolbarButton } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { SavePatternModal } from './SavePatternModal'

export function SavePatternButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasSelection = useSelect((select) => {
    const { getSelectedBlockClientIds } = select('core/block-editor')
    return getSelectedBlockClientIds().length > 0
  }, [])

  if (!hasSelection) {
    return null
  }

  return (
    <>
      <BlockControls group="other">
        <ToolbarGroup>
          <ToolbarButton
            icon="download"
            label={__('Save as Pattern', 'stratawp')}
            onClick={() => setIsModalOpen(true)}
          />
        </ToolbarGroup>
      </BlockControls>
      {isModalOpen && (
        <SavePatternModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}
```

### Commit

```bash
git add packages/studio/src/gutenberg/
git commit -m "feat(studio): implement SavePatternButton with block selection"
```

---

## Task 3: Implement SavePatternModal Component

**Files:**
- Modify: `packages/studio/src/gutenberg/save-pattern-plugin/SavePatternModal.tsx`

### Implementation

- Fetch categories on mount
- Form fields: name, category, tags
- On save:
  1. Get selected blocks
  2. Serialize to HTML
  3. POST to API
  4. Show success notice
  5. Close modal

### Commit

```bash
git add packages/studio/src/gutenberg/
git commit -m "feat(studio): implement SavePatternModal with API integration"
```

---

## Task 4: Create Gutenberg Entry Point and Build Config

**Files:**
- Create: `packages/studio/src/gutenberg/index.ts`
- Modify: `packages/studio/vite.config.ts`
- Modify: `packages/studio/php/Studio.php`

### Step 1: Create gutenberg/index.ts

```typescript
import './save-pattern-plugin'
```

### Step 2: Update vite.config.ts for multiple entry points

Add gutenberg entry that builds separately for block editor context.

### Step 3: Update Studio.php to enqueue gutenberg script

Enqueue on `enqueue_block_editor_assets` hook.

### Step 4: Build and verify

```bash
pnpm build --filter @stratawp/studio
```

### Commit

```bash
git add packages/studio/
git commit -m "feat(studio): add Gutenberg build entry and enqueue script"
```

---

## Task 5: Add Styles and Final Testing

**Files:**
- Create: `packages/studio/src/gutenberg/save-pattern-plugin/styles.css` (if needed)

### Step 1: Add any needed modal styles

### Step 2: Full build verification

```bash
pnpm build
pnpm typecheck --filter @stratawp/studio
```

### Step 3: Final commit

```bash
git add .
git commit -m "feat(studio): complete Save as Pattern Gutenberg integration"
```

---

## Summary

**Phase 2B delivers:**
- Gutenberg plugin registered via `registerPlugin`
- Toolbar button visible when blocks selected
- Modal for entering pattern name, category, tags
- API integration to save pattern
- Success notification

**Files created:**
- `packages/studio/src/gutenberg/index.ts`
- `packages/studio/src/gutenberg/save-pattern-plugin/index.tsx`
- `packages/studio/src/gutenberg/save-pattern-plugin/SavePatternButton.tsx`
- `packages/studio/src/gutenberg/save-pattern-plugin/SavePatternModal.tsx`

**Files modified:**
- `packages/studio/vite.config.ts`
- `packages/studio/php/Studio.php`
