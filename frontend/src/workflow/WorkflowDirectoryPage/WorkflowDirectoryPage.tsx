/**
 * WorkflowDirectoryPage — REQ-WF-FE-F-001 to F-003
 *
 * Hub page with 3 navigation cards.
 */

import { useNavigate } from 'react-router-dom'
import Card from '@/shared/Card/Card'

const MODULES = [
    {
        title: 'Submission Workflow',
        description: 'Manage and assign incoming submissions.',
        path: '/workflow/submissions',
    },
    {
        title: 'Clearance Workflow',
        description: 'Review and clear submissions for duplicate checks.',
        path: '/workflow/clearance',
    },
    {
        title: 'Data Quality',
        description: 'Review and resolve data quality issues.',
        path: '/workflow/data-quality',
    },
]

export default function WorkflowDirectoryPage() {
    const navigate = useNavigate()

    return (
        <div className="p-6 flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-gray-900">Workflow</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {MODULES.map((mod) => (
                    <Card
                        key={mod.path}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(mod.path)}
                    >
                        <div className="p-5 flex flex-col gap-2">
                            <p className="font-semibold text-gray-900">{mod.title}</p>
                            <p className="text-sm text-gray-500">{mod.description}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
