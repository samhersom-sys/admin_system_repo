import { useEffect, useState } from 'react'
import { get } from '@/shared/lib/api-client/api-client'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'
import { date } from '@/shared/lib/formatters/formatters'
import Card from '@/shared/Card/Card'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'
import ResizableGrid from '@/shared/components/ResizableGrid/ResizableGrid'

/**
 * TasksWidget � personal task list (system-assigned + user-created).
 *
 * Shows at most 5 tasks, scoped to the current user.
 * Architecture rules: no hex literals, no raw colour names, no direct fetch,
 * no domains/ imports.  Overdue highlighting uses brand token references only.
 */

function isOverdue(dueDate: string | null | undefined) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

interface Task {
  id: string | number
  description: string
  relatedReference?: string
  source: string
  dueDate?: string | null
}

export default function TasksWidget({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchTasks() {
      try {
        const res = await get<Task[]>(`/api/tasks?assignedTo=${userId}`, {})
        // Backend returns a raw array
        const raw = Array.isArray(res) ? res : []
        if (!cancelled) {
          setTasks(raw.slice(0, 5))
        }
      } catch (err) {
        if (!cancelled) setError('Unable to load tasks.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTasks()
    return () => { cancelled = true }
  }, [userId])

  return (
    <div data-testid="tasks-widget">
      <Card title="My Tasks">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Loading tasks" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {!loading && !error && (
          <ResizableGrid
            storageKey="table-widths-tasks"
            columns={[
              { key: 'task',   label: 'Task',   sortable: false, defaultWidth: 300 },
              { key: 'source', label: 'Source',  sortable: false, defaultWidth: 100 },
              { key: 'due',    label: 'Due',     sortable: false, defaultWidth: 110 },
            ]}
            rows={tasks}
            rowKey={(row) => (row as Task).id}
            emptyMessage="No tasks assigned."
            renderCell={(key, row) => {
              const task = row as Task
              const overdue = isOverdue(task.dueDate)
              const dueBadge = overdue ? brandClasses.badge.warning : brandClasses.badge.infoSmall
              if (key === 'task') return (
                <span data-testid="task-item">
                  <p className={`text-sm truncate ${overdue ? brandClasses.badge.warning : brandClasses.typography.body}`}>
                    {task.description}
                  </p>
                  {task.relatedReference && (
                    <p className="text-xs text-gray-400 mt-0.5">{task.relatedReference}</p>
                  )}
                </span>
              )
              if (key === 'source') return task.source === 'system'
                ? <span data-testid="task-source-system" className={`rounded-full px-2 py-0.5 text-xs ${brandClasses.badge.info}`}>System</span>
                : <span data-testid="task-source-user" className={`rounded-full px-2 py-0.5 text-xs ${brandClasses.badge.primarySmall}`}>Mine</span>
              if (key === 'due') return task.dueDate
                ? <span className={`rounded-full px-2 py-0.5 text-xs ${dueBadge}`}>{date(task.dueDate)}</span>
                : null
              return null
            }}
          />
        )}

        {!loading && !error && (
          <div className="mt-3 border-t border-gray-100 pt-2 text-right">
            <a
              href="/my-work-items"
              className={`text-xs ${brandClasses.text.primary} ${brandClasses.text.primaryHover}`}
            >
              View all
            </a>
          </div>
        )}
      </Card>
    </div>
  )
}
