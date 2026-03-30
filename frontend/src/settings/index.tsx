import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiUser,
  FiBriefcase,
  FiPackage,
  FiSliders,
  FiAlertTriangle,
  FiLayers,
  FiChevronRight,
} from 'react-icons/fi'
import { getSession } from '@/shared/lib/auth-session/auth-session'
import Card from '@/shared/Card/Card'

/**
 * Settings page — tile grid navigation.
 *
 * REQ-SETTINGS-GRID-F-001 through F-007
 * Requirements: settings.requirements.md
 */

interface Tile {
  title: string
  description: string
  icon: React.ElementType
  path: string
  roles: string[]
}

const ALL_TILES: Tile[] = [
  {
    title: 'Account Administration',
    description: 'Manage user accounts, roles and permissions for your organisation.',
    icon: FiUser,
    path: '/settings/account',
    roles: ['client_admin', 'internal_admin'],
  },
  {
    title: 'Product Configuration',
    description: 'Configure insurance product definitions, classes and sub-classes.',
    icon: FiPackage,
    path: '/settings/products',
    roles: ['client_admin', 'internal_admin'],
  },
  {
    title: 'Organisation Configuration',
    description: 'Manage organisation hierarchy, entities and office locations.',
    icon: FiBriefcase,
    path: '/settings/organisations',
    roles: ['client_admin', 'internal_admin'],
  },
  {
    title: 'Rating Rules',
    description: 'Define and maintain rating algorithms, factors and tables.',
    icon: FiSliders,
    path: '/settings/rating-rules',
    roles: ['client_admin', 'internal_admin'],
  },
  {
    title: 'Data Quality Configuration',
    description: 'Set field validation rules, completeness thresholds and quality standards.',
    icon: FiAlertTriangle,
    path: '/settings/data-quality',
    roles: ['client_admin', 'internal_admin'],
  },
  {
    title: 'Module Licensing',
    description: 'Manage per-organisation module access and licensing for all tenant companies.',
    icon: FiLayers,
    path: '/settings/module-licensing',
    roles: ['internal_admin'],
  },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const session = getSession()
  const role = session?.user?.role ?? ''

  const tiles = ALL_TILES.filter(t => t.roles.includes(role))

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(tile => {
          const Icon = tile.icon
          return (
            <button
              key={tile.path}
              onClick={() => navigate(tile.path)}
              className="w-full text-left"
            >
              <Card className="hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{tile.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{tile.description}</p>
                  </div>
                  <FiChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 mt-0.5" />
                </div>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}


