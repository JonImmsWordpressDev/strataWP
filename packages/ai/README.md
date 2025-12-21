# @stratawp/ai

AI-assisted development tools for StrataWP WordPress themes. Generate blocks, components, and patterns using OpenAI GPT-4 or Anthropic Claude.

## Features

- **AI Code Generation**: Generate Gutenberg blocks, theme components, and block patterns from natural language descriptions
- **Code Review**: Analyze code for security vulnerabilities, performance issues, and best practices
- **Documentation Generation**: Automatically create comprehensive documentation in Markdown, PHPDoc, or JSDoc formats
- **Multiple AI Providers**: Support for both OpenAI (GPT-4) and Anthropic (Claude 3.5 Sonnet)
- **Flexible Configuration**: Configure via `.env` files or centralized config file

## Installation

```bash
pnpm add @stratawp/ai
```

## Setup

### Interactive Setup (Recommended)

Run the interactive setup wizard to configure your AI provider:

```bash
stratawp ai:setup
```

The wizard will guide you through:
1. Choosing your AI provider (OpenAI or Anthropic)
2. Entering your API key
3. Selecting a model (optional)
4. Configuring advanced settings (temperature, max tokens)
5. Choosing where to store your configuration

### Manual Setup

#### Option 1: Environment Variables (.env)

Create a `.env` file in your theme directory:

```env
# AI Provider (openai or anthropic)
STRATAWP_AI_PROVIDER=anthropic

# API Key (get from provider's dashboard)
STRATAWP_AI_API_KEY=your-api-key-here

# Optional: Model selection
STRATAWP_AI_MODEL=claude-3-5-sonnet-20241022

# Optional: Temperature (0.0-1.0, default: 0.7)
STRATAWP_AI_TEMPERATURE=0.7

# Optional: Max tokens (default: 2000)
STRATAWP_AI_MAX_TOKENS=2000
```

#### Option 2: Config File

Configuration is stored at `~/.stratawp/ai-config.json`:

```json
{
  "provider": "anthropic",
  "apiKey": "your-api-key-here",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

## Usage

### Generate Code

Generate Gutenberg blocks, theme components, or block patterns from natural language descriptions.

```bash
# Generate a Gutenberg block
stratawp ai:generate block

# Generate a theme component
stratawp ai:generate component

# Generate a block pattern
stratawp ai:generate pattern

# Specify output path
stratawp ai:generate block -o src/blocks/hero/generated.md
```

**Example: Generate a Hero Block**

```bash
$ stratawp ai:generate block

🤖 AI Code Generator

? Describe the block you want to create: A hero section with a large heading, subheading, call-to-action button, and background image support
? Block name: hero-section

Generating code with AI... ✔

✓ Saved to: src/blocks/hero-section/generated.md
```

The AI will generate:
- `block.json` with block metadata
- `index.tsx` with the block registration and edit function
- `save.tsx` with the save function

### Review Code

Analyze code for security vulnerabilities, performance issues, and WordPress best practices.

```bash
# Review a file (all focus areas)
stratawp ai:review inc/Components/CustomPostTypes.php

# Focus on security
stratawp ai:review src/blocks/contact-form/index.tsx -f security

# Focus on performance
stratawp ai:review functions.php -f performance

# Focus on best practices
stratawp ai:review src/utils/api.ts -f best-practices
```

**Example: Security Review**

```bash
$ stratawp ai:review inc/Components/ContactForm.php -f security

🔍 AI Code Review

Analyzing code... ✔

============================================================
Code Review Results
============================================================

## Security Issues

### Critical
- Line 42: Unescaped user input in output
  Recommendation: Use `esc_html()` or `esc_attr()` to escape user data

### Medium
- Line 67: Missing nonce verification in form submission
  Recommendation: Add `wp_verify_nonce()` check

## Performance Concerns
...
```

### Generate Documentation

Create comprehensive documentation for your code in multiple formats.

```bash
# Generate documentation (auto-detect format from file extension)
stratawp ai:document inc/Components/Menus.php

# Specify format explicitly
stratawp ai:document src/blocks/team/index.tsx -f jsdoc

# Save to file
stratawp ai:document inc/Components/Menus.php -o docs/components/menus.md
```

**Supported Formats:**
- **Markdown**: Comprehensive documentation with sections
- **PHPDoc**: WordPress-compatible PHP documentation
- **JSDoc**: TypeScript/JavaScript documentation

**Example: Generate PHPDoc**

```bash
$ stratawp ai:document inc/Components/CustomPostTypes.php -f phpdoc

📚 AI Documentation Generator

Generating documentation... ✔

============================================================
Generated Documentation
============================================================

/**
 * Custom Post Types Component
 *
 * Registers custom post types for the theme.
 *
 * @package StrataWP
 * @since 1.0.0
 */
class CustomPostTypes implements ComponentInterface {
    /**
     * Initialize the component
     *
     * @return void
     */
    public function init(): void { ... }
}
```

## AI Providers

### OpenAI (GPT-4)

**Get API Key:** https://platform.openai.com/api-keys

**Supported Models:**
- `gpt-4-turbo-preview` (default)
- `gpt-4`
- `gpt-3.5-turbo`

**Configuration:**
```env
STRATAWP_AI_PROVIDER=openai
STRATAWP_AI_API_KEY=sk-...
STRATAWP_AI_MODEL=gpt-4-turbo-preview
```

### Anthropic (Claude)

**Get API Key:** https://console.anthropic.com/

**Supported Models:**
- `claude-3-5-sonnet-20241022` (default, recommended)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`

**Configuration:**
```env
STRATAWP_AI_PROVIDER=anthropic
STRATAWP_AI_API_KEY=sk-ant-...
STRATAWP_AI_MODEL=claude-3-5-sonnet-20241022
```

## Programmatic Usage

You can use the AI package programmatically in your Node.js scripts:

```typescript
import { OpenAIProvider, AnthropicProvider, ConfigManager } from '@stratawp/ai'

// Load configuration
const configManager = new ConfigManager()
const config = await configManager.load()

// Initialize provider
const provider = config.provider === 'openai'
  ? new OpenAIProvider(config)
  : new AnthropicProvider(config)

// Generate completion
const response = await provider.complete([
  {
    role: 'system',
    content: 'You are an expert WordPress developer.'
  },
  {
    role: 'user',
    content: 'Generate a custom post type for portfolio items'
  }
])

console.log(response.content)

// Stream response
await provider.stream(
  [
    { role: 'user', content: 'Explain WordPress hooks' }
  ],
  {
    onToken: (token) => process.stdout.write(token),
    onComplete: (text) => console.log('\n\nComplete!'),
    onError: (error) => console.error('Error:', error)
  }
)
```

## Advanced Configuration

### Temperature

Controls randomness in responses (0.0 - 1.0):
- **0.0-0.3**: Focused, deterministic (good for code generation)
- **0.4-0.7**: Balanced (default)
- **0.8-1.0**: Creative, varied

```env
STRATAWP_AI_TEMPERATURE=0.5
```

### Max Tokens

Maximum length of AI responses:
- **500-1000**: Short responses (code snippets)
- **2000**: Default (balanced)
- **4000-8000**: Long responses (comprehensive documentation)

```env
STRATAWP_AI_MAX_TOKENS=3000
```

## Best Practices

1. **Start with Setup**: Run `stratawp ai:setup` before using AI commands
2. **Be Specific**: Provide detailed descriptions when generating code
3. **Review Output**: Always review AI-generated code before using in production
4. **Security First**: Use `ai:review` with `-f security` on user-facing code
5. **Iterate**: AI suggestions are starting points—refine as needed
6. **Version Control**: Commit AI-generated code separately for easy review

## Troubleshooting

### "No AI configuration found"

Run `stratawp ai:setup` to configure your AI provider.

### "Invalid API key"

Verify your API key is correct:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

### Rate Limits

AI providers have rate limits. If you hit limits:
- Wait a few minutes before retrying
- Reduce `maxTokens` for shorter responses
- Upgrade your API plan if needed

### Connection Errors

Check your internet connection and verify the AI provider's status:
- OpenAI Status: https://status.openai.com/
- Anthropic Status: https://status.anthropic.com/

## Examples

### Generate a Complete Contact Form Block

```bash
$ stratawp ai:generate block

? Describe the block: A contact form with name, email, message fields, and spam protection. Include client-side validation and success/error states.
? Block name: contact-form

✓ Generated complete block with validation and state management!
```

### Review a Security-Sensitive Component

```bash
$ stratawp ai:review inc/Components/UserAuth.php -f security

# AI will analyze for:
# - SQL injection vulnerabilities
# - XSS vulnerabilities
# - CSRF protection
# - Input sanitization
# - Nonce verification
# - Capability checks
```

### Generate Complete API Documentation

```bash
$ stratawp ai:document src/api/products.ts -f markdown -o docs/api/products.md

# Generates comprehensive docs with:
# - Function signatures
# - Parameter descriptions
# - Return types
# - Usage examples
# - Error handling
```

## Contributing

Contributions are welcome! Please see the [main StrataWP repository](https://github.com/JonImmsWordpressDev/StrataWP) for contribution guidelines.

## License

GPL-3.0-or-later

## Support

- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **Discussions**: https://github.com/JonImmsWordpressDev/StrataWP/discussions
- **Documentation**: https://github.com/JonImmsWordpressDev/StrataWP#readme

## Credits

Powered by:
- [OpenAI GPT-4](https://openai.com/)
- [Anthropic Claude](https://www.anthropic.com/)

---

**Note**: AI-generated code is a starting point. Always review, test, and refine AI suggestions before deploying to production.
