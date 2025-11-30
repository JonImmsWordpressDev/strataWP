/**
 * Filesystem utilities for CLI commands
 */
import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'
import ora, { Ora } from 'ora'

/**
 * Check if a file or directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath)
}

/**
 * Ensure directory exists, create if not
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath)
}

/**
 * Write file with content
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf8')
}

/**
 * Write JSON file
 */
export async function writeJson(
  filePath: string,
  data: Record<string, unknown>,
  pretty = true
): Promise<void> {
  await fs.writeJson(filePath, data, { spaces: pretty ? 2 : 0 })
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8')
}

/**
 * Read JSON file
 */
export async function readJson<T = Record<string, unknown>>(filePath: string): Promise<T> {
  return fs.readJson(filePath)
}

/**
 * Copy file or directory
 */
export async function copy(src: string, dest: string): Promise<void> {
  await fs.copy(src, dest)
}

/**
 * Remove file or directory
 */
export async function remove(filePath: string): Promise<void> {
  await fs.remove(filePath)
}

/**
 * Get list of files in directory
 */
export async function readDir(dirPath: string): Promise<string[]> {
  return fs.readdir(dirPath)
}

/**
 * Create a file with spinner feedback
 */
export async function createFileWithSpinner(
  filePath: string,
  content: string,
  description?: string
): Promise<void> {
  const spinner = ora(description || `Creating ${path.basename(filePath)}`).start()

  try {
    await ensureDir(path.dirname(filePath))
    await writeFile(filePath, content)
    spinner.succeed(chalk.green(`Created ${path.relative(process.cwd(), filePath)}`))
  } catch (error) {
    spinner.fail(chalk.red(`Failed to create ${path.basename(filePath)}`))
    throw error
  }
}

/**
 * Create multiple files with spinner feedback
 */
export async function createFiles(
  files: Array<{ path: string; content: string }>,
  baseDescription?: string
): Promise<void> {
  const spinner = ora(baseDescription || 'Creating files').start()

  try {
    for (const file of files) {
      await ensureDir(path.dirname(file.path))
      await writeFile(file.path, file.content)
    }
    spinner.succeed(chalk.green(`Created ${files.length} file(s)`))
  } catch (error) {
    spinner.fail(chalk.red('Failed to create files'))
    throw error
  }
}

/**
 * Check if path is inside current working directory
 */
export function isPathSafe(filePath: string): boolean {
  const cwd = process.cwd()
  const resolved = path.resolve(cwd, filePath)
  return resolved.startsWith(cwd)
}

/**
 * Get relative path from cwd
 */
export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath)
}

/**
 * Create directory structure
 */
export async function createDirStructure(
  baseDir: string,
  structure: string[]
): Promise<void> {
  for (const dir of structure) {
    await ensureDir(path.join(baseDir, dir))
  }
}

/**
 * File operation with error handling
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
  spinner?: Ora,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red(errorMessage || 'Operation failed'))
    }
    console.error(error)
    process.exit(1)
  }
}
