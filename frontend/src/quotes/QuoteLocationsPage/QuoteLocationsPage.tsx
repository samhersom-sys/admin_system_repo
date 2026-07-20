import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LocationsScheduleTab from '@/locations/LocationsScheduleTab/LocationsScheduleTab'
import { getQuote, isQuoteEditable } from '@/quotes/quotes.service'
import type { Quote } from '@/quotes/quotes.service'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

export default function QuoteLocationsPage() {
    const { id } = useParams<{ id: string }>()
    const quoteId = Number(id)
    const { addNotification } = useNotifications()

    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!Number.isFinite(quoteId) || quoteId <= 0) return
        setLoading(true)
        getQuote(quoteId)
            .then(setQuote)
            .catch((err: Error) => {
                addNotification(`Could not load quote: ${err.message}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [quoteId]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!Number.isFinite(quoteId) || quoteId <= 0) {
        return <div className="p-6 text-sm text-red-600">Invalid quote id.</div>
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="p-6 flex flex-col gap-4">
            <div className="text-sm text-gray-500">
                <Link to={`/quotes/${quoteId}`} className="text-brand-600 hover:underline">
                    {quote?.reference ?? 'Quote'}
                </Link>
                {' / Locations'}
            </div>

            <div>
                <h1 className="text-lg font-semibold text-gray-900">Schedule of Values</h1>
                <p className="text-sm text-gray-500">Manage schedules for this quote.</p>
            </div>

            <LocationsScheduleTab
                entityType="Quote"
                entityId={quoteId}
                quoteId={quoteId}
                editable={quote ? isQuoteEditable(quote) : false}
            />
        </div>
    )
}
