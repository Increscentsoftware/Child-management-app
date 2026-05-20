import { useAppStore } from '@/lib/store'
import type { Role } from '@/types'

export interface Permissions {
  canManageUsers: boolean
  canEditChildren: boolean
  canViewAnalytics: boolean
  canExportData: boolean
  canManageDashboards: boolean
  canAddGifts: boolean
  canRecordPerformance: boolean
  canViewAllChildren: boolean
}

const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  admin: {
    canManageUsers: true,
    canEditChildren: true,
    canViewAnalytics: true,
    canExportData: true,
    canManageDashboards: true,
    canAddGifts: true,
    canRecordPerformance: true,
    canViewAllChildren: true,
  },
  supervisor: {
    canManageUsers: false,
    canEditChildren: true,
    canViewAnalytics: true,
    canExportData: true,
    canManageDashboards: false,
    canAddGifts: true,
    canRecordPerformance: true,
    canViewAllChildren: true,
  },
  field_worker: {
    canManageUsers: false,
    canEditChildren: true,
    canViewAnalytics: false,
    canExportData: false,
    canManageDashboards: false,
    canAddGifts: true,
    canRecordPerformance: true,
    canViewAllChildren: false,
  },
}

export function usePermissions(): Permissions & { role: Role | null } {
  const { user } = useAppStore()
  const role = user?.role || null
  
  if (!role) {
    return {
      role: null,
      canManageUsers: false,
      canEditChildren: false,
      canViewAnalytics: false,
      canExportData: false,
      canManageDashboards: false,
      canAddGifts: false,
      canRecordPerformance: false,
      canViewAllChildren: false,
    }
  }

  return { role, ...ROLE_PERMISSIONS[role] }
}

export function useCanAccess(permission: keyof Permissions): boolean {
  const perms = usePermissions()
  return perms[permission]
}
