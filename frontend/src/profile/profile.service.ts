/**
 * Profile service — REQ-PROFILE-F-001 through F-009
 * All API calls for the profile domain.
 * Requirements: profile.requirements.md
 */

import * as apiClient from '@/shared/lib/api-client/api-client'

export interface ProfileData {
    id: number
    fullName?: string
    name?: string
    email: string
    role: string
    orgCode: string
}

export async function getProfile(): Promise<ProfileData> {
    return apiClient.get<ProfileData>('/api/auth/me')
}

export async function updateProfile(name: string): Promise<{ data: ProfileData }> {
    return apiClient.put<{ data: ProfileData }>('/api/auth/profile', { name })
}

export async function changePassword(
    currentPassword: string,
    newPassword: string,
): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/auth/change-password', {
        currentPassword,
        newPassword,
    })
}
