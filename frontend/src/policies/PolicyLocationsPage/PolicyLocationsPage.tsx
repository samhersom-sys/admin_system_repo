import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LocationsScheduleTab from '@/locations/LocationsScheduleTab/LocationsScheduleTab'
import { getPolicy } from '@/policies/policies.service'
import type { Policy } from '@/policies/policies.service'
import { useNotifications } from '@/shell/NotificationDock'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

export default function PolicyLocationsPage() {
    const { id } = useParams<{ id: string }>()
    const policyId = Number(id)
    const { addNotification } = useNotifications()

    const [policy, setPolicy] = useState<Policy | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!Number.isFinite(policyId) || policyId <= 0) return
        setLoading(true)
        getPolicy(policyId)
            .then(setPolicy)
            .catch((err: Error) => {
                addNotification(`Could not load policy: ${err.message}`, 'error')
            })
            .finally(() => setLoading(false))
    }, [policyId]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!Number.isFinite(policyId) || policyId <= 0) {
        return <div className="p-6 text-sm text-red-600">Invalid policy id.</div>
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
                <Link to={`/policies/${policyId}`} className="text-brand-600 hover:underline">
                    {policy?.reference ?? 'Policy'}
                </Link>
                {' / Locations'}
            </div>

            <div>
                <h1 className="text-lg font-semibold text-gray-900">Schedule of Values</h1>
                <p className="text-sm text-gray-500">Manage schedules for this policy.</p>
            </div>

            <LocationsScheduleTab
                entityType="Policy"
                entityId={policyId}
                editable={false}
            />
        </div>
    )
}
