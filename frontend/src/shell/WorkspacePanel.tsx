/**
 * WorkspacePanel — floating workspace switcher rendered inside the sidebar.
 *
 * Shows all open workspaces; supports rename (click pencil), close (click ×),
 * and open-new-workspace (New button).  Clicking a workspace row calls
 * onClose() so the panel dismisses after switching.
 */
import { useRef, useState } from 'react'
import { FiPlus, FiEdit2, FiX } from 'react-icons/fi'
import { useWorkspace, getPageTitle } from './WorkspaceContext'
import type { Workspace } from './WorkspaceContext'

function formatLastActive(isoStr: string): string {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

interface WorkspacePanelProps {
  onClose: () => void
}

export default function WorkspacePanel({ onClose }: WorkspacePanelProps) {
  const {
    workspaces,
    activeWorkspaceId,
    addWorkspace,
    switchWorkspace,
    closeWorkspace,
    renameWorkspace,
  } = useWorkspace()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(ws: Workspace) {
    setEditingId(ws.id)
    setEditValue(ws.name)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function commitEdit(id: string) {
    const trimmed = editValue.trim()
    if (trimmed) renameWorkspace(id, trimmed)
    setEditingId(null)
  }

  return (
    <div
      className="workspace-panel"
      role="dialog"
      aria-label="Open workspaces"
    >
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="workspace-panel-header">
        <span className="workspace-panel-title">Workspaces</span>
        <button
          type="button"
          className="workspace-panel-add"
          onClick={addWorkspace}
          title="Open a new workspace"
        >
          <FiPlus size={13} aria-hidden="true" />
          <span>New</span>
        </button>
      </div>

      {/* ─── List ────────────────────────────────────────────── */}
      <ul className="workspace-panel-list" role="list">
        {workspaces.length === 0 && (
          <li className="workspace-panel-empty">No workspaces open</li>
        )}

        {workspaces.map(ws => (
          <li
            key={ws.id}
            className={`workspace-panel-item${ws.id === activeWorkspaceId
              ? ' workspace-panel-item--active'
              : ''}`}
          >
            <button
              type="button"
              className="workspace-panel-item-body"
              onClick={() => { switchWorkspace(ws.id); onClose() }}
            >
              {editingId === ws.id ? (
                <input
                  ref={inputRef}
                  className="workspace-panel-rename-input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(ws.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit(ws.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="workspace-panel-item-name">{ws.name}</span>
                  <span className="workspace-panel-item-path">
                    {getPageTitle(ws.path)}
                  </span>
                  <span className="workspace-panel-item-time">
                    {formatLastActive(ws.lastActive)}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              className="workspace-panel-edit"
              onClick={e => { e.stopPropagation(); startEdit(ws) }}
              title="Rename workspace"
            >
              <FiEdit2 size={11} aria-hidden="true" />
            </button>

            {workspaces.length > 1 && (
              <button
                type="button"
                className="workspace-panel-close"
                onClick={e => { e.stopPropagation(); closeWorkspace(ws.id) }}
                title="Close workspace"
              >
                <FiX size={11} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
