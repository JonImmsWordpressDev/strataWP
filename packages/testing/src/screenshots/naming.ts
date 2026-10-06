export function routeSlug(route: string): string {
  const slug = route
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return slug === '' ? 'home' : slug
}

export interface PlannedShot {
  route: string
  width: number
  name: string
}

/** Route-major plan. Filenames are unique even when two routes slug alike. */
export function planShots(routes: string[], widths: number[]): PlannedShot[] {
  const used = new Set<string>()
  const planned: PlannedShot[] = []
  for (const route of routes) {
    const slug = routeSlug(route)
    for (const width of widths) {
      let name = `${slug}-${width}.png`
      for (let attempt = 2; used.has(name); attempt++) {
        name = `${slug}-${attempt}-${width}.png`
      }
      used.add(name)
      planned.push({ route, width, name })
    }
  }
  return planned
}
