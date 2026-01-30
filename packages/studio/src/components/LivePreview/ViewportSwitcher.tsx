import { Button, ButtonGroup } from '@wordpress/components'
import { desktop, tablet, mobile } from '@wordpress/icons'
import { __ } from '@wordpress/i18n'

export type Viewport = 'desktop' | 'tablet' | 'mobile'

interface ViewportSwitcherProps {
  viewport: Viewport
  onChange: (viewport: Viewport) => void
}

export function ViewportSwitcher({ viewport, onChange }: ViewportSwitcherProps) {
  return (
    <ButtonGroup className="stratawp-viewport-switcher">
      <Button
        icon={desktop}
        label={__('Desktop', 'stratawp')}
        isPressed={viewport === 'desktop'}
        onClick={() => onChange('desktop')}
      />
      <Button
        icon={tablet}
        label={__('Tablet', 'stratawp')}
        isPressed={viewport === 'tablet'}
        onClick={() => onChange('tablet')}
      />
      <Button
        icon={mobile}
        label={__('Mobile', 'stratawp')}
        isPressed={viewport === 'mobile'}
        onClick={() => onChange('mobile')}
      />
    </ButtonGroup>
  )
}
