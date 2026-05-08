/**
 * BADocumentsPage — REQ-BA-FE-F-090 to F-098
 *
 * Document management for a binding authority.
 * Lists generated documents; allows generating a new PDF snapshot.
 * Uses /api/binding-authorities/:id/documents endpoints.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiFileText, FiPlus } from 'react-icons/fi'
import { get, post, getBlob } from '@/shared/lib/api-client/api-client'
import { useNotifications } from '@/shell/NotificationDock'
import { useSidebarSection } from '@/shell/SidebarContext'
import type { SidebarSection } from '@/shell/SidebarContext'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

interface BADocument {
    id: number
    reference: string
    format: string
    filename: string
    created_at: string
}

export default function BADocumentsPage() {
    const { id } = useParams<{ id: string }>()
    const { addNotification } = useNotifications()
    const baId = parseInt(id ?? '0', 10)

    // Sidebar section — §14.6 every single-record page must register contextual section
    const sidebarSection = useMemo<SidebarSection>(() => ({
        title: 'Binding Authority',
        items: [
            { label: 'Back to Binding Authority', icon: FiArrowLeft, to: `/binding-authorities/${baId}` },
        ],
    }), [baId])
    useSidebarSection(sidebarSection)

    const [docs, setDocs] = useState<BADocument[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    const fetchDocs = useCallback(async () => {
        if (!baId) return
        setLoading(true)
        try {
            const data = await get<BADocument[]>(`/api/binding-authorities/${baId}/documents`)
            setDocs(data)
        } catch {
            addNotification('Could not load documents.', 'error')
        } finally {
            setLoading(false)
        }
    }, [baId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchDocs() }, [fetchDocs])

    async function handleGenerate() {
        setGenerating(true)
        try {
            await post(`/api/binding-authorities/${baId}/documents/generate?format=pdf`, {})
            addNotification('PDF generated successfully.', 'success')
            await fetchDocs()
        } catch {
            addNotification('Could not generate PDF. Ensure pdfkit is installed.', 'error')
        } finally {
            setGenerating(false)
        }
    }

    async function handleDownload(doc: BADocument) {
        try {
            const blob = await getBlob(`/api/binding-authorities/${baId}/documents/${doc.id}/download`)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = doc.filename
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            addNotification('Could not download document.', 'error')
        }
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Documents</h2>
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                    <FiPlus size={14} />
                    {generating ? 'Generating…' : 'Generate PDF'}
                </button>
            </div>

            {/* Document list */}
            {loading ? (
                <LoadingSpinner />
            ) : docs.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <FiFileText className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-sm text-gray-400">No documents generated yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Generate PDF" to create a contract snapshot.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-600">Filename</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Format</th>
                                <th className="px-4 py-3 font-medium text-gray-600">Generated</th>
                                <th className="px-4 py-3 font-medium text-gray-600 w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map((doc) => (
                                <tr key={doc.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{doc.filename}</td>
                                    <td className="px-4 py-3 uppercase text-xs">{doc.format}</td>
                                    <td className="px-4 py-3">{new Date(doc.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => handleDownload(doc)}
                                            className="text-brand-600 hover:text-brand-800"
                                            title="Download"
                                        >
                                            <FiDownload size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
