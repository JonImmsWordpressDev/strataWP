import AxeBuilder from '@axe-core/playwright'

/** WCAG 2.1 A/AA tag set for the blocking gate. */
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

/** axe scanner scoped to WCAG 2.1 A/AA, excluding the wp-env admin bar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeAxeBuilder(page: any): AxeBuilder {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	return new AxeBuilder({ page }).withTags([...WCAG_AA_TAGS]).exclude('#wpadminbar')
}
