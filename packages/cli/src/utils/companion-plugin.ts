import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

export const COMPANION_PLUGIN_SLUG = 'strata-advanced-content'

/** Templates that depend on the companion plugin's content types. */
const TEMPLATES_WITH_COMPANION = new Set(['advanced-theme'])

export interface InstallCompanionPluginOptions {
  /** Root of the linked WordPress install; nothing is written when undefined. */
  wpRoot?: string
  /** Bundled template directory name (for example `advanced-theme`). */
  templateName: string
  /** Asks the user; only called once every other precondition holds. */
  confirm: () => Promise<boolean>
  copy?: (from: string, to: string) => Promise<void>
  bundledDir?: string
}

export interface InstallCompanionPluginResult {
  installed: boolean
  message: string
}

/**
 * The bundled plugin ships at `<cli package>/templates/plugins/...`; this
 * module lives in `src/utils` (tests) or is inlined into `dist` (published).
 */
function defaultBundledDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const relative = path.join('templates', 'plugins', COMPANION_PLUGIN_SLUG)
  const candidates = [path.join(here, '..', relative), path.join(here, '..', '..', relative)]
  return candidates.find((dir) => fs.pathExistsSync(dir)) ?? candidates[0]
}

export function manualInstallInstruction(): string {
  return `Copy plugins/${COMPANION_PLUGIN_SLUG} from the StrataWP repository into wp-content/plugins and activate it.`
}

/**
 * Offer to copy the companion plugin (portfolio, team, testimonial and
 * case-study content types) into a linked WordPress site. Writes nothing
 * unless a site was linked, the template needs it and the user agrees, and
 * never overwrites an existing plugin directory.
 */
export async function installCompanionPlugin(
  options: InstallCompanionPluginOptions
): Promise<InstallCompanionPluginResult> {
  const { wpRoot, templateName, confirm } = options
  const copy =
    options.copy ?? ((from, to) => fs.copy(from, to, { overwrite: false, errorOnExist: true }))
  const bundledDir = options.bundledDir ?? defaultBundledDir()

  if (!TEMPLATES_WITH_COMPANION.has(templateName)) {
    return { installed: false, message: 'This template does not use the companion plugin.' }
  }
  if (!wpRoot) {
    return {
      installed: false,
      message: `No WordPress install was linked. ${manualInstallInstruction()}`,
    }
  }
  if (!(await confirm())) {
    return { installed: false, message: manualInstallInstruction() }
  }

  const target = path.join(wpRoot, 'wp-content', 'plugins', COMPANION_PLUGIN_SLUG)
  if (await fs.pathExists(target)) {
    return {
      installed: false,
      message: `A plugin already exists at ${target}; left it untouched. ${manualInstallInstruction()}`,
    }
  }
  if (!(await fs.pathExists(bundledDir))) {
    return { installed: false, message: `Bundled plugin not found. ${manualInstallInstruction()}` }
  }

  try {
    await copy(bundledDir, target)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      installed: false,
      message: `Could not copy the plugin (${reason}). ${manualInstallInstruction()}`,
    }
  }
  return {
    installed: true,
    message: `Installed ${COMPANION_PLUGIN_SLUG} to ${target}. Activate it under Plugins.`,
  }
}
