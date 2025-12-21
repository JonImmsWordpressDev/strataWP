/**
 * Example Block Unit Test
 * Demonstrates how to test Gutenberg blocks with StrataWP testing utilities
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  renderBlockEdit,
  testBlockRegistration,
  setupWordPressMocks,
  setupCustomMatchers,
} from '@stratawp/testing/vitest'

// Setup
beforeAll(() => {
  setupWordPressMocks()
  setupCustomMatchers()
})

describe('Example Block', () => {
  it('should register correctly', () => {
    testBlockRegistration('stratawp/example', {
      title: 'Example Block',
      category: 'common',
      attributes: {
        content: {
          type: 'string',
          default: '',
        },
      },
    })
  })

  it('should render edit component', () => {
    // Mock edit component
    const EditComponent = ({ attributes, setAttributes }: any) => {
      return (
        <div className="wp-block-stratawp-example">
          <p>{attributes.content || 'Enter content...'}</p>
        </div>
      )
    }

    const { getByText } = renderBlockEdit(EditComponent, {
      attributes: { content: 'Test content' },
    })

    expect(getByText('Test content')).toBeInTheDocument()
  })

  it('should update attributes', () => {
    const setAttributes = vi.fn()

    const EditComponent = ({ attributes, setAttributes }: any) => {
      return (
        <div>
          <input
            value={attributes.content}
            onChange={(e) => setAttributes({ content: e.target.value })}
          />
        </div>
      )
    }

    const { getByRole } = renderBlockEdit(EditComponent, {
      attributes: { content: 'Test' },
      setAttributes,
    })

    const input = getByRole('textbox')
    userEvent.type(input, ' content')

    expect(setAttributes).toHaveBeenCalled()
  })

  it('should have correct block classes', () => {
    const SaveComponent = ({ attributes }: any) => {
      return (
        <div className="wp-block-stratawp-example">
          {attributes.content}
        </div>
      )
    }

    const { container } = renderBlockSave(SaveComponent, {
      attributes: { content: 'Test' },
    })

    const blockElement = container.firstChild as HTMLElement
    expect(blockElement).toHaveBlockClass('stratawp/example')
  })
})
