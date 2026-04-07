/**
 * Profile page — REQ-PROFILE-F-001 through F-009
 * Requirements: profile.requirements.md
 */

import React, { useEffect, useState } from 'react'
import { useNotifications } from '@/shell/NotificationDock'
import { getProfile, updateProfile, changePassword, type ProfileData } from './profile.service'
import Card from '@/shared/Card/Card'

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export default function ProfilePage() {
  const { addNotification } = useNotifications()

  // Profile info state
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    getProfile().then(data => {
      setProfile(data)
      setName((data as any).fullName ?? (data as any).name ?? '')
    })
  }, [])

  // -------------------------------------------------------------------------
  // Derived password button state
  // -------------------------------------------------------------------------

  const passwordMeetsRules = PASSWORD_REGEX.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword
  const canChangePassword =
    currentPassword.length > 0 && passwordMeetsRules && passwordsMatch

  const passwordBtnTooltip = !passwordMeetsRules
    ? 'Password does not meet requirements'
    : !passwordsMatch
      ? 'Passwords do not match'
      : ''

  // -------------------------------------------------------------------------
  // Save profile
  // -------------------------------------------------------------------------

  async function handleSaveProfile() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    if (name.trim().length > 100) {
      setNameError('Name must be 100 characters or fewer')
      return
    }
    setNameError('')

    await updateProfile(name.trim())
    addNotification('Profile updated successfully', 'success')
  }

  // -------------------------------------------------------------------------
  // Change password
  // -------------------------------------------------------------------------

  async function handleChangePassword() {
    setPasswordError('')
    try {
      await changePassword(currentPassword, newPassword)
      addNotification('Password changed successfully', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      if (err?.status === 401) {
        setPasswordError('Current password is incorrect')
      } else {
        addNotification('Failed to change password', 'error')
      }
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>

      {/* Profile Information card */}
      <Card>
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Profile Information</h2>

          {/* Full Name — editable */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="profile-name">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          </div>

          {/* Email — read-only */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="text-sm text-gray-600">{profile?.email ?? '—'}</p>
          </div>

          {/* Role — read-only */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <p className="text-sm text-gray-600">{profile?.role ?? '—'}</p>
          </div>

          {/* Organisation — read-only */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Organisation</label>
            <p className="text-sm text-gray-600">{profile?.orgCode ?? '—'}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Save
            </button>
          </div>
        </div>
      </Card>

      {/* Change Password card */}
      <Card>
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="current-password">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="new-password">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Minimum 8 characters, at least 1 uppercase letter and 1 number.
            </p>
            {newPassword.length > 0 && !passwordMeetsRules && (
              <p className="text-sm text-red-600">Password does not meet requirements</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={!canChangePassword}
              title={passwordBtnTooltip}
              className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Change Password
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
