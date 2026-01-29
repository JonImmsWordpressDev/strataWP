/**
 * BlockLibraryPage component
 *
 * Main page for the Block Library, displaying tabs for Showcase, Create, and Variations.
 * Phase 1: Only Showcase tab is implemented.
 */

import { useState } from '@wordpress/element'
import { TabPanel, SnackbarList } from '@wordpress/components'
import { useDispatch, useSelect } from '@wordpress/data'
import { store as noticesStore } from '@wordpress/notices'
import { __ } from '@wordpress/i18n'
import { ShowcaseTab } from './ShowcaseTab'

type TabName = 'showcase' | 'create' | 'variations'

interface Tab {
  name: TabName
  title: string
  className?: string
  disabled?: boolean
}

/**
 * Placeholder for Create tab (Phase 2)
 */
function CreateTab() {
  return (
    <div className="stratawp-block-library__coming-soon">
      <h3>{__('Create Custom Blocks', 'stratawp')}</h3>
      <p>{__('Block creation tools coming in a future update.', 'stratawp')}</p>
    </div>
  )
}

/**
 * Placeholder for Variations tab (Phase 2)
 */
function VariationsTab() {
  return (
    <div className="stratawp-block-library__coming-soon">
      <h3>{__('Block Variations', 'stratawp')}</h3>
      <p>{__('Block variations management coming in a future update.', 'stratawp')}</p>
    </div>
  )
}

/**
 * Main Block Library page component
 */
export function BlockLibraryPage() {
  const [activeTab, setActiveTab] = useState<TabName>('showcase')

  // Toast notifications
  const { removeNotice } = useDispatch(noticesStore)
  const notices = useSelect((select) => select(noticesStore).getNotices(), [])
  const snackbarNotices = notices.filter((notice) => notice.type === 'snackbar')

  const tabs: Tab[] = [
    {
      name: 'showcase',
      title: __('Showcase', 'stratawp'),
    },
    {
      name: 'create',
      title: __('Create', 'stratawp'),
      className: 'is-disabled',
    },
    {
      name: 'variations',
      title: __('Variations', 'stratawp'),
      className: 'is-disabled',
    },
  ]

  const renderTabContent = (tab: Tab) => {
    switch (tab.name) {
      case 'showcase':
        return <ShowcaseTab />
      case 'create':
        return <CreateTab />
      case 'variations':
        return <VariationsTab />
      default:
        return null
    }
  }

  return (
    <div className="stratawp-block-library">
      {/* Header */}
      <div className="stratawp-block-library__header">
        <h1 className="stratawp-block-library__title">
          {__('Block Library', 'stratawp')}
        </h1>
      </div>

      {/* Tab Navigation */}
      <TabPanel
        className="stratawp-block-library__tabs"
        tabs={tabs}
        initialTabName="showcase"
        onSelect={(tabName) => setActiveTab(tabName as TabName)}
      >
        {(tab) => renderTabContent(tab as Tab)}
      </TabPanel>

      {/* Toast Notifications */}
      <SnackbarList
        notices={snackbarNotices}
        onRemove={(id: string) => removeNotice(id)}
        className="stratawp-block-library__notices"
      />
    </div>
  )
}
