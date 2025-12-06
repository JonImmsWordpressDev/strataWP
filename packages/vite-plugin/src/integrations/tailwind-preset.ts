/**
 * WordPress-aware Tailwind CSS Preset
 *
 * Maps WordPress theme.json values to Tailwind configuration
 */

// Use any type for Config since tailwindcss is an optional peer dependency
export const strataWPTailwindPreset: Partial<any> = {
  theme: {
    extend: {
      colors: {
        // WordPress color palette mappings
        'wp-primary': 'var(--wp--preset--color--primary)',
        'wp-secondary': 'var(--wp--preset--color--secondary)',
        'wp-accent': 'var(--wp--preset--color--accent)',
        'wp-text': 'var(--wp--preset--color--text)',
        'wp-text-muted': 'var(--wp--preset--color--text-muted)',
        'wp-background': 'var(--wp--preset--color--background)',
        'wp-background-secondary': 'var(--wp--preset--color--background-secondary)',
        'wp-border': 'var(--wp--preset--color--border)',
        'wp-success': 'var(--wp--preset--color--success)',
        'wp-warning': 'var(--wp--preset--color--warning)',
        'wp-error': 'var(--wp--preset--color--error)',
      },

      spacing: {
        // WordPress spacing scale mappings
        'wp-xs': 'var(--wp--preset--spacing--xs)',
        'wp-sm': 'var(--wp--preset--spacing--sm)',
        'wp-md': 'var(--wp--preset--spacing--md)',
        'wp-lg': 'var(--wp--preset--spacing--lg)',
        'wp-xl': 'var(--wp--preset--spacing--xl)',
        'wp-2xl': 'var(--wp--preset--spacing--2xl)',
      },

      fontFamily: {
        // WordPress font family mappings
        'wp-sans': 'var(--wp--preset--font-family--sans)',
        'wp-serif': 'var(--wp--preset--font-family--serif)',
        'wp-mono': 'var(--wp--preset--font-family--mono)',
      },

      fontSize: {
        // WordPress font size mappings
        'wp-xs': 'var(--wp--preset--font-size--xs)',
        'wp-sm': 'var(--wp--preset--font-size--sm)',
        'wp-base': 'var(--wp--preset--font-size--base)',
        'wp-lg': 'var(--wp--preset--font-size--lg)',
        'wp-xl': 'var(--wp--preset--font-size--xl)',
        'wp-2xl': 'var(--wp--preset--font-size--2xl)',
        'wp-3xl': 'var(--wp--preset--font-size--3xl)',
        'wp-4xl': 'var(--wp--preset--font-size--4xl)',
      },

      borderRadius: {
        // WordPress border radius mappings
        'wp-sm': 'var(--wp--preset--border-radius--sm)',
        'wp-md': 'var(--wp--preset--border-radius--md)',
        'wp-lg': 'var(--wp--preset--border-radius--lg)',
      },

      maxWidth: {
        // WordPress content width
        'wp-container': 'var(--wp--style--global--content-size)',
        'wp-wide': 'var(--wp--style--global--wide-size)',
      },
    },
  },

  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './inc/**/*.php',
    './templates/**/*.html',
    './parts/**/*.{php,html}',
    './blocks/**/*.{js,jsx,ts,tsx,php}',
  ],

  safelist: [
    // Safelist common WordPress block classes
    { pattern: /^wp-block-.+/ },
    { pattern: /^has-.+-color$/ },
    { pattern: /^has-.+-background-color$/ },
    { pattern: /^has-.+-border-color$/ },
    { pattern: /^has-.+-font-size$/ },
    { pattern: /^has-.+-font-family$/ },
  ],
}

export default strataWPTailwindPreset
