/**
 * Validation utilities for CLI commands
 */
import validateNpmPackageName from 'validate-npm-package-name'

/**
 * Convert a string to kebab-case slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(text: string): string {
  return text
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toUpperCase())
}

/**
 * Convert a string to camelCase
 */
export function toCamelCase(text: string): string {
  const pascal = toPascalCase(text)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * Validate a block name
 */
export function validateBlockName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Block name cannot be empty' }
  }

  const slug = slugify(name)

  if (slug.length === 0) {
    return { valid: false, error: 'Block name must contain valid characters' }
  }

  if (slug.length > 50) {
    return { valid: false, error: 'Block name is too long (max 50 characters)' }
  }

  return { valid: true }
}

/**
 * Validate a component name
 */
export function validateComponentName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Component name cannot be empty' }
  }

  const pascal = toPascalCase(name)

  if (!/^[A-Z][a-zA-Z0-9]*$/.test(pascal)) {
    return { valid: false, error: 'Component name must be valid PascalCase' }
  }

  if (pascal.length > 50) {
    return { valid: false, error: 'Component name is too long (max 50 characters)' }
  }

  return { valid: true }
}

/**
 * Validate a template name
 */
export function validateTemplateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Template name cannot be empty' }
  }

  const slug = slugify(name)

  if (slug.length === 0) {
    return { valid: false, error: 'Template name must contain valid characters' }
  }

  if (slug.length > 50) {
    return { valid: false, error: 'Template name is too long (max 50 characters)' }
  }

  return { valid: true }
}

/**
 * Validate a template part name
 */
export function validatePartName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Part name cannot be empty' }
  }

  const slug = slugify(name)

  if (slug.length === 0) {
    return { valid: false, error: 'Part name must contain valid characters' }
  }

  if (slug.length > 50) {
    return { valid: false, error: 'Part name is too long (max 50 characters)' }
  }

  return { valid: true }
}

/**
 * Validate a PHP namespace
 */
export function validateNamespace(namespace: string): { valid: boolean; error?: string } {
  if (!namespace || namespace.trim().length === 0) {
    return { valid: false, error: 'Namespace cannot be empty' }
  }

  // PHP namespace format: Vendor\Package\SubPackage
  if (!/^[A-Z][a-zA-Z0-9]*(\\[A-Z][a-zA-Z0-9]*)*$/.test(namespace)) {
    return { valid: false, error: 'Invalid PHP namespace format (e.g., MyTheme\\Components)' }
  }

  return { valid: true }
}

/**
 * Validate a package name for npm
 */
export function validatePackageName(name: string): { valid: boolean; error?: string } {
  const result = validateNpmPackageName(name)

  if (!result.validForNewPackages) {
    const errors = result.errors || []
    return {
      valid: false,
      error: errors[0] || 'Invalid package name'
    }
  }

  return { valid: true }
}

/**
 * Validate file path (no traversal)
 */
export function validatePath(path: string): { valid: boolean; error?: string } {
  if (!path || path.trim().length === 0) {
    return { valid: false, error: 'Path cannot be empty' }
  }

  // Check for path traversal attempts
  if (path.includes('..') || path.includes('~')) {
    return { valid: false, error: 'Path contains invalid characters' }
  }

  return { valid: true }
}
