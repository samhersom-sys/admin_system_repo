/**
 * TemplateSelector — REQ-RPT-FE-F-036
 *
 * Modal for selecting a dashboard layout template.
 * Shows all standard DASHBOARD_TEMPLATES in a visual slot grid.
 */

import { FiX } from 'react-icons/fi'
import { DASHBOARD_TEMPLATES, type DashboardTemplate } from './DashboardTemplates'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSelectTemplate: (template: DashboardTemplate) => void
    currentTemplate?: string | null
}

export default function TemplateSelector({ isOpen, onClose, onSelectTemplate, currentTemplate }: Props) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Choose Dashboard Layout</h2>
                        <p className="text-sm text-gray-600 mt-1">Select a template for this page</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FiX size={24} />
                    </button>
                </div>

                {/* Templates Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-6">
                        {Object.values(DASHBOARD_TEMPLATES).map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => {
                                    onSelectTemplate(template)
                                    onClose()
                                }}
                                className={`p-6 border-2 rounded-lg text-left transition-all hover:border-brand-500 hover:shadow-md ${currentTemplate === template.id
                                        ? 'border-brand-500 bg-gray-50'
                                        : 'border-gray-200'
                                    }`}
                            >
                                {/* Visual slot preview */}
                                <div
                                    className="mb-4 bg-gray-100 rounded overflow-hidden"
                                    style={{ height: '140px' }}
                                >
                                    <div
                                        className="grid gap-1 w-full h-full p-2"
                                        style={{
                                            gridTemplateColumns: 'repeat(4, 1fr)',
                                            gridAutoRows: 'minmax(0, 1fr)',
                                        }}
                                    >
                                        {template.slots.map((slot) => (
                                            <div
                                                key={slot.id}
                                                className="bg-brand-400 rounded flex items-center justify-center text-white text-xs font-bold"
                                                style={{
                                                    gridColumn: `${slot.col + 1} / span ${slot.colSpan}`,
                                                    gridRow: `${slot.row + 1} / span ${slot.rowSpan}`,
                                                }}
                                            >
                                                {slot.id}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                                <p className="text-sm text-gray-600">{template.description}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {template.slots.length} widget{template.slots.length !== 1 ? 's' : ''}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center gap-3 p-6 border-t bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
