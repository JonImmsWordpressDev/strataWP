# @stratawp/explorer

Interactive component explorer and documentation browser for StrataWP themes. Similar to Storybook, but specifically designed for WordPress Block Themes with automatic component discovery and live preview.

## Features

- **Auto-Discovery**: Automatically discovers all blocks, components, patterns, templates, and template parts
- **Live Preview**: Interactive preview with viewport testing (Mobile, Tablet, Desktop)
- **Hot Reload**: Automatically updates when you modify components
- **Attribute Controls**: Real-time attribute testing and manipulation
- **Source Code Viewer**: View component source code directly in the browser
- **Component Filtering**: Search and filter by type, name, or tags
- **Multiple Component Types**: Supports blocks, React components, patterns, templates, and parts
- **WebSocket Updates**: Real-time component updates via WebSocket connection

## Installation

```bash
pnpm add -D @stratawp/explorer
```

## Quick Start

Launch the component explorer from your theme directory:

```bash
stratawp explorer
```

Or use the alias:

```bash
stratawp storybook
```

The explorer will automatically:
1. Discover all components in your theme
2. Start a dev server on `http://localhost:3000`
3. Open your browser
4. Watch for file changes and hot-reload

## CLI Options

```bash
stratawp explorer [options]

Options:
  -p, --port <port>    Port number (default: 3000)
  -h, --host <host>    Host address (default: localhost)
  --no-open            Don't open browser automatically
```

### Examples

```bash
# Launch on custom port
stratawp explorer --port 4000

# Launch without opening browser
stratawp explorer --no-open

# Launch on specific host
stratawp explorer --host 0.0.0.0 --port 8080
```

## Component Discovery

The explorer automatically discovers components from these locations:

### Gutenberg Blocks
- **Location**: `src/blocks/**/block.json`
- **Metadata**: Reads from `block.json`
- **Preview**: Shows block with editable attributes

### React Components
- **Location**: `src/components/**/*.tsx`
- **Metadata**: Extracted from JSDoc comments
- **Preview**: Renders React component

### Block Patterns
- **Location**: `patterns/**/*.php`
- **Metadata**: Extracted from PHP comments
- **Preview**: Shows pattern markup

### FSE Templates
- **Location**: `templates/**/*.html`
- **Preview**: Renders full template

### Template Parts
- **Location**: `parts/**/*.html`
- **Preview**: Renders template part

## Component Metadata

### Blocks (block.json)

The explorer reads standard WordPress `block.json` metadata:

```json
{
  "name": "my-theme/my-block",
  "title": "My Block",
  "description": "A custom block",
  "category": "design",
  "keywords": ["custom", "feature"],
  "attributes": {
    "content": {
      "type": "string",
      "default": ""
    }
  },
  "example": {
    "attributes": {
      "content": "Example content"
    }
  }
}
```

### React Components (JSDoc)

Add metadata using JSDoc comments:

```tsx
/**
 * @title Button Component
 * @description A reusable button component
 */
export function Button({ children, variant = 'primary' }) {
  return (
    <button className={`btn btn-${variant}`}>
      {children}
    </button>
  )
}
```

### Patterns (PHP Comments)

Add metadata in PHP comment block:

```php
<?php
/**
 * Title: Hero Section
 * Description: Full-width hero with CTA
 * Categories: featured, call-to-action
 */
?>
<!-- Pattern markup -->
```

## UI Components

### Sidebar
- **Component List**: Grouped by type with search and filtering
- **Type Badges**: Color-coded badges for each component type
- **Tags**: Component keywords/categories
- **Active Selection**: Highlights currently selected component

### Preview Area
- **Viewport Controls**: Switch between Mobile, Tablet, Desktop, and Full width
- **Live Preview**: Real-time component rendering
- **Attribute Panel**: Edit block attributes in real-time
- **Refresh Button**: Manually refresh preview
- **Open in Tab**: Open preview in new browser tab

### Details Panel
Three tabs:

1. **Info Tab**
   - Component name and title
   - Type and category
   - File path
   - Attributes table with types and defaults
   - Tags/keywords

2. **Source Tab**
   - Full source code display
   - Syntax highlighting
   - Copy button

3. **Examples Tab**
   - Pre-configured examples
   - Example attributes
   - Usage code

## Programmatic Usage

### Start Server Programmatically

```typescript
import { ExplorerDevServer } from '@stratawp/explorer'

const server = new ExplorerDevServer({
  port: 3000,
  host: 'localhost',
  open: true,
  rootDir: process.cwd(),
  discovery: {
    includeBlocks: true,
    includeComponents: true,
    includePatterns: true,
    includeTemplates: true,
    includeParts: true,
  },
})

await server.start()
```

### Component Discovery

```typescript
import { ComponentDiscovery } from '@stratawp/explorer'

const discovery = new ComponentDiscovery(process.cwd(), {
  includeBlocks: true,
  includeComponents: true,
})

const components = await discovery.discoverAll()
console.log(`Found ${components.length} components`)

// Watch for changes
discovery.watch(
  (component) => {
    console.log('Component updated:', component.name)
  },
  (id) => {
    console.log('Component removed:', id)
  }
)
```

## WebSocket API

The explorer uses WebSocket for real-time updates.

### Client Connection

```typescript
const ws = new WebSocket('ws://localhost:3000')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'init':
      // Initial component list
      console.log(message.components)
      break

    case 'component-updated':
      // Component was modified
      console.log(message.component)
      break

    case 'component-removed':
      // Component was deleted
      console.log(message.component.id)
      break

    case 'refresh':
      // Full refresh requested
      break
  }
}
```

## HTTP API

The explorer server provides a REST API:

### Get All Components
```
GET /api/components
```

Returns array of all discovered components.

### Get Single Component
```
GET /api/components/:id
```

Returns component info by ID.

### Get Component Source
```
GET /api/components/:id/source
```

Returns component source code.

### Health Check
```
GET /api/health
```

Returns server status.

## Viewport Sizes

Pre-configured viewport sizes:

| Name    | Width | Height |
|---------|-------|--------|
| Mobile  | 375px | 667px  |
| Tablet  | 768px | 1024px |
| Desktop | 1440px| 900px  |
| Full    | 100%  | 100%   |

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Focus search
- `Esc`: Clear selection
- `↑/↓`: Navigate components
- `Enter`: Select component

## Development Workflow

1. **Start Explorer**
   ```bash
   stratawp explorer
   ```

2. **Browse Components**
   - View all components in the sidebar
   - Filter by type or search by name
   - Click to preview

3. **Test Components**
   - Change viewport size
   - Edit attributes in real-time
   - View different examples

4. **Modify Code**
   - Edit component files
   - Explorer auto-updates
   - See changes instantly

5. **View Source**
   - Click "Source" tab
   - Copy code snippets
   - Understand implementation

## Best Practices

### 1. Add Rich Metadata

**Blocks:**
```json
{
  "description": "Clear, concise description",
  "keywords": ["relevant", "searchable", "terms"],
  "example": {
    "attributes": {
      // Realistic example data
    }
  }
}
```

**Components:**
```tsx
/**
 * @title Descriptive Title
 * @description What this component does
 */
```

### 2. Provide Examples

Add example configurations to help users understand usage:

```json
{
  "example": {
    "attributes": {
      "heading": "Welcome to My Site",
      "showButton": true,
      "buttonText": "Get Started"
    }
  }
}
```

### 3. Use Meaningful Names

- Use clear, descriptive component names
- Follow naming conventions
- Add keywords for discoverability

### 4. Document Attributes

Provide clear attribute descriptions:

```json
{
  "attributes": {
    "alignment": {
      "type": "string",
      "enum": ["left", "center", "right"],
      "default": "left"
    }
  }
}
```

### 5. Organize by Category

Use categories to group related components:

```json
{
  "category": "design",
  "keywords": ["hero", "banner", "featured"]
}
```

## Troubleshooting

### Port Already in Use

**Problem:** Port 3000 is already in use

**Solution:** Use a different port:
```bash
stratawp explorer --port 4000
```

### Components Not Showing

**Problem:** Components aren't appearing in the explorer

**Solution:** Check that:
1. Files are in the correct directories
2. `block.json` files are valid JSON
3. PHP files have proper comment headers
4. No syntax errors in component files

### Hot Reload Not Working

**Problem:** Changes aren't reflected automatically

**Solution:**
1. Check that file watcher is working
2. Manually refresh with the refresh button
3. Restart the explorer

### WebSocket Connection Failed

**Problem:** Real-time updates not working

**Solution:**
1. Check browser console for errors
2. Verify WebSocket port is open
3. Check firewall settings

## Integration with Other Tools

### VS Code

Add a task to launch the explorer:

```json
{
  "label": "Launch Component Explorer",
  "type": "shell",
  "command": "pnpm stratawp explorer",
  "problemMatcher": []
}
```

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "explorer": "stratawp explorer",
    "storybook": "stratawp storybook"
  }
}
```

## Examples

See the `examples/` directory for complete theme examples with various component types.

## Contributing

Contributions are welcome! Please see the [main StrataWP repository](https://github.com/JonImmsWordpressDev/StrataWP) for contribution guidelines.

## License

GPL-3.0-or-later

## Support

- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **Discussions**: https://github.com/JonImmsWordpressDev/StrataWP/discussions
- **Documentation**: https://github.com/JonImmsWordpressDev/StrataWP#readme

---

**Explore with Confidence!** Build better WordPress themes with the StrataWP Component Explorer.
