/**
 * NewBAPage — REQ-BA-FE-F-009 to F-015
 *
 * Form to create a new binding authority.
 * Coverholder selected via CoverholderSearchModal (party type = coverholder).
 * POST on save → navigate to /binding-authorities/:id
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSave, FiSearch, FiX } from 'react-icons/fi'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import { createBindingAuthority, type CreateBAInput } from '../binding-authorities.service'
import CoverholderSearchModal from '../CoverholderSearchModal/CoverholderSearchModal'

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)

const EMPTY_FORM: CreateBAInput & { coverholder_name: string } = {
    coverholder_id: 0,
    coverholder_name: '',
    inception_date: today,
    expiry_date: addDays(today, 365),
    year_of_account: new Date().getFullYear(),
}

export default function NewBAPage() {
    const navigate = useNavigate()
    const { addNotification } = useNotifications()

    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [coverholderModalOpen, setCoverholderModalOpen] = useState(false)

    // Sidebar section (REQ-BA-FE-F-015)
    const sidebarSection = useMemo(() => ({
        title: 'Binding Authority',
        items: [{ label: 'Save', icon: FiSave, event: 'ba:save' }],
    }), [])
    useSidebarSection(sidebarSection)

    useEffect(() => {
        const handler = () => handleSave()
        window.addEventListener('ba:save', handler)
        return () => window.removeEventListener('ba:save', handler)
    })

    function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
        setForm((prev) => {
            const next = { ...prev, [key]: value }
            if (key === 'inception_date' && typeof value === 'string') {
                next.expiry_date = addDays(value, 365)
            }
            return next
        })
    }

    async function handleSave() {
        if (!form.coverholder_name.trim()) {
            addNotification('Coverholder is required.', 'error')
            return
        }
        if (!form.inception_date) {
            addNotification('Inception date is required.', 'error')
            return
        }
        setSaving(true)
        try {
            const created = await createBindingAuthority({
                coverholder_id: form.coverholder_id || 0,
                inception_date: form.inception_date,
                expiry_date: form.expiry_date,
                year_of_account: form.year_of_account,
            })
            addNotification('Binding authority created.', 'success')
            navigate(`/binding-authorities/${created.id}`)
        } catch {
            addNotification('Could not create binding authority.', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-gray-900">New Binding Authority</h2>

            <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <label htmlFor="ba-coverholder" className="text-sm font-medium text-gray-700">
                        Coverholder <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            id="ba-coverholder"
                            type="text"
                            value={form.coverholder_name}
                            readOnly
                            placeholder="Select coverholder…"
                            className="border border-gray-300 rounded px-3 py-2 text-sm w-full bg-white pr-16"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {form.coverholder_name && (
                                <button
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, coverholder_name: '', coverholder_id: 0 }))}
                                    title="Clear"
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <FiX size={14} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setCoverholderModalOpen(true)}
                                title="Search Coverholder"
                                className="text-gray-500 hover:text-brand-600"
                            >
                                <FiSearch size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="ba-inception" className="text-sm font-medium text-gray-700">
                            Inception Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="ba-inception"
                            type="date"
                            value={form.inception_date}
                            onChange={(e) => setField('inception_date', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="ba-expiry" className="text-sm font-medium text-gray-700">
                            Expiry Date
                        </label>
                        <input
                            id="ba-expiry"
                            type="date"
                            value={form.expiry_date}
                            onChange={(e) => setField('expiry_date', e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="ba-yoa" className="text-sm font-medium text-gray-700">
                        Year of Account
                    </label>
                    <input
                        id="ba-yoa"
                        type="number"
                        min={2000}
                        max={2100}
                        value={form.year_of_account ?? ''}
                        onChange={(e) => setField('year_of_account', parseInt(e.target.value) || null)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm w-32"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/binding-authorities')}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <CoverholderSearchModal
                isOpen={coverholderModalOpen}
                onClose={() => setCoverholderModalOpen(false)}
                onSelect={(party) =>
                    setForm((prev) => ({
                        ...prev,
                        coverholder_name: party.name,
                        coverholder_id: party.id,
                    }))
                }
            />
        </div>
    )
}
