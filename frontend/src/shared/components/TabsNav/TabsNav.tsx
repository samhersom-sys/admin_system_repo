/**
 * TabsNav — horizontal tab bar with brand-500 active-tab underline.
 *
 * Requirements: requirements.md
 * Tests: __tests__/TabsNav.test.tsx
 *
 * REQ-SHARED-TABS-F-001 — one button per tab entry
 * REQ-SHARED-TABS-F-002 — active tab has brand-500 border-bottom class
 * REQ-SHARED-TABS-F-003 — onChange called with key on click
 * REQ-SHARED-TABS-F-004 — data-testid="tab-{key}" on each button
 */

import React from 'react'

export interface TabItem {
    key: string
    label: string
}

interface TabsNavProps {
    tabs: TabItem[]
    activeTab: string
    onChange: (key: string) => void
}

export default function TabsNav({ tabs, activeTab, onChange }: TabsNavProps) {
    return (
        <nav className="flex space-x-6 border-b border-gray-200">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    data-testid={`tab-${tab.key}`}
                    onClick={() => onChange(tab.key)}
                    className={
                        activeTab === tab.key
                            ? 'pb-2 text-sm font-medium border-b-2 border-brand-500 text-brand-600 -mb-px'
                            : 'pb-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-px'
                    }
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    )
}
