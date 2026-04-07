/**
 * Data Quality Settings page — REQ-SETTINGS-DQUALITY-F-001 through F-004
 * Requirements: settings.requirements.md §3d
 */

import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiSave } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import {
    getDataQualitySettings,
    saveDataQualitySettings,
    type DQSettings,
} from './settings.service'

const DEFAULTS: DQSettings = {
    enableBASectionDateValidation: true,
    enableQuoteMandatoryFields: true,
    enablePolicyMandatoryFields: true,
    excludeDraftStatus: true,
    severityThreshold: 'medium',
    autoCheckOnSave: true,
    emailNotifications: false,
    notificationEmail: '',
}

export default function DataQualitySettingsPage() {
    const { addNotification } = useNotifications()
    const [settings, setSettings] = useState<DQSettings>(DEFAULTS)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        getDataQualitySettings()
            .then(data => setSettings(prev => ({ ...prev, ...data })))
    }, [])

    function handleChange<K extends keyof DQSettings>(field: K, value: DQSettings[K]) {
        setSettings(prev => ({ ...prev, [field]: value }))
    }

    async function handleSave() {
        setSaving(true)
        try {
            await saveDataQualitySettings(settings)
            addNotification('Data quality settings saved successfully', 'success')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                    <FiAlertTriangle className="mr-3 text-brand-500" />
                    Data Quality Configuration
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Configure validation rules and monitoring settings for data quality
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 flex flex-col gap-6">

                    {/* Validation Rules */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Rules</h3>
                        <div className="flex flex-col gap-4">
                            <ToggleRow
                                label="Enable BA Section Date Validation"
                                description="Validate inception, expiry, and effective dates on binding authority sections"
                                checked={settings.enableBASectionDateValidation}
                                onChange={v => handleChange('enableBASectionDateValidation', v)}
                            />
                            <ToggleRow
                                label="Enable Quote Mandatory Fields"
                                description="Check for missing method of placement, contract type, and dates"
                                checked={settings.enableQuoteMandatoryFields}
                                onChange={v => handleChange('enableQuoteMandatoryFields', v)}
                            />
                            <ToggleRow
                                label="Enable Policy Mandatory Fields"
                                description="Validate policy dates and other required information"
                                checked={settings.enablePolicyMandatoryFields}
                                onChange={v => handleChange('enablePolicyMandatoryFields', v)}
                            />
                            <ToggleRow
                                label="Exclude Draft Status"
                                description="Don't report issues for entities in Draft status"
                                checked={settings.excludeDraftStatus}
                                onChange={v => handleChange('excludeDraftStatus', v)}
                            />
                        </div>
                    </section>

                    <hr className="border-gray-200" />

                    {/* Severity Settings */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Settings</h3>
                        <label htmlFor="severity-threshold" className="block font-medium text-gray-700 mb-1">
                            Severity Threshold
                        </label>
                        <p className="text-sm text-gray-600 mb-3">
                            Only show issues at or above this severity level
                        </p>
                        <select
                            id="severity-threshold"
                            value={settings.severityThreshold}
                            onChange={e => handleChange('severityThreshold', e.target.value as DQSettings['severityThreshold'])}
                            className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs text-sm"
                        >
                            <option value="low">Low and above</option>
                            <option value="medium">Medium and above</option>
                            <option value="high">High only</option>
                        </select>
                    </section>

                    <hr className="border-gray-200" />

                    {/* Monitoring */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monitoring</h3>
                        <div className="flex flex-col gap-4">
                            <ToggleRow
                                label="Auto-Check on Save"
                                description="Automatically validate data quality when saving entities"
                                checked={settings.autoCheckOnSave}
                                onChange={v => handleChange('autoCheckOnSave', v)}
                            />
                            <ToggleRow
                                label="Email Notifications"
                                description="Send email alerts for high severity issues"
                                checked={settings.emailNotifications}
                                onChange={v => handleChange('emailNotifications', v)}
                            />
                            {settings.emailNotifications && (
                                <div>
                                    <label htmlFor="notification-email" className="block font-medium text-gray-700 mb-2">
                                        Notification Email
                                    </label>
                                    <input
                                        id="notification-email"
                                        type="email"
                                        value={settings.notificationEmail}
                                        onChange={e => handleChange('notificationEmail', e.target.value)}
                                        placeholder="admin@example.com"
                                        className="border border-gray-300 rounded px-3 py-2 w-full max-w-md text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-100">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FiSave className="mr-2" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// ToggleRow helper
// ---------------------------------------------------------------------------

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (value: boolean) => void
}) {
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return (
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <label htmlFor={id} className="font-medium text-gray-700">{label}</label>
                <p className="text-sm text-gray-600">{description}</p>
            </div>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="w-5 h-5 text-brand-600"
            />
        </div>
    )
}
