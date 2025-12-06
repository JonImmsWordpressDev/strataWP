# Contributing to StrataWP

Thank you for your interest in contributing to StrataWP!

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PHP 8.1+
- Composer

### Setup

```bash
# Clone the repository
git clone https://github.com/StrataWP/stratawp.git
cd stratawp

# Install dependencies
pnpm install

# Run in development mode
pnpm dev
```

## Project Structure

```
StrataWP/
├── packages/
│   ├── cli/          # CLI tool
│   ├── core/         # PHP framework
│   ├── vite-plugin/  # Vite integration
│   └── ...
├── examples/         # Example themes
└── docs/            # Documentation
```

## Development Workflow

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test your changes: `pnpm test`
4. Lint your code: `pnpm lint`
5. Commit using conventional commits (see below)
6. Push and create a pull request

### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `refactor:` Code refactoring
- `test:` Test additions/changes

Examples:
```bash
git commit -m "feat(cli): add block generator command"
git commit -m "fix(vite-plugin): resolve HMR issue with PHP files"
git commit -m "docs: update README with new examples"
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests for specific package
pnpm --filter @stratawp/cli test
```

### Code Style

- TypeScript: Use Prettier (config included)
- PHP: Follow WordPress Coding Standards
- Commit messages: Conventional Commits format

```bash
# Format all files
pnpm format

# Lint all files
pnpm lint
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md if applicable
5. Request review from maintainers

## Package Development

### Creating a New Package

```bash
# Create directory
mkdir -p packages/my-package

# Add package.json
# Add to workspace in root package.json
```

### Publishing

We use Changesets for version management:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish (maintainers only)
pnpm release
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Join our community (coming soon!)

## License

By contributing, you agree that your contributions will be licensed under GPL-3.0-or-later.

---

**Thank you for contributing to StrataWP!**
