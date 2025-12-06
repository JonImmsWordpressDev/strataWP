/**
 * Main Theme JavaScript
 *
 * Built with StrataWP
 */

// Import styles
import '../css/main.css'

/**
 * Mobile menu toggle
 */
function initMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle')
  const nav = document.querySelector<HTMLElement>('.main-navigation')

  if (!toggle || !nav) return

  toggle.addEventListener('click', () => {
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true'
    toggle.setAttribute('aria-expanded', String(!isExpanded))
    nav.classList.toggle('toggled')
  })
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll(): void {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href')
      if (!href || href === '#') return

      const target = document.querySelector(href)
      if (target) {
        e.preventDefault()
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    })
  })
}

/**
 * Initialize theme
 */
function init(): void {
  initMobileMenu()
  initSmoothScroll()

  console.log('⚒️ StrataWP theme loaded!')
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// Hot Module Replacement (HMR) for development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('⚡ HMR: Reloading...')
  })
}
