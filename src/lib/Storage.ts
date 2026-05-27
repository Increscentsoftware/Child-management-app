// lib/storage.ts
/**
 * Supabase Storage Service
 * Handles document uploads, downloads, and management
 * Integrates with existing Supabase setup
 */

import { supabase } from './supabase'
import toast from 'react-hot-toast'

// Storage bucket names
export const STORAGE_BUCKETS = {
  CHILD_DOCUMENTS: 'child-documents',
  CHILD_PHOTOS: 'child-photos',
  BACKUPS: 'backups'
} as const

// Document types
export type DocumentType = 'aadhar' | 'birth_cert' | 'progress_card' | 'photo' | 'certificate' | 'other'
export type DocumentCategory = 'admission' | 'follow_up'

export interface UploadDocumentOptions {
  childId: string
  category: DocumentCategory
  file: File
  documentType: DocumentType
  yearLabel?: string
  notes?: string
}

export interface DocumentMetadata {
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  storageUrl: string
  documentType: DocumentType
  category: DocumentCategory
  yearLabel?: string
  uploadedAt: string
  uploadedBy?: string
}

export interface StorageError {
  message: string
  code: string
  originalError?: any
}

/**
 * Upload a document to Supabase Storage
 * Automatically organizes by child ID and category
 */
export async function uploadDocument(
  options: UploadDocumentOptions
): Promise<{ path: string; url: string; size: number } | null> {
  try {
    const { childId, category, file, documentType, yearLabel } = options

    // Validate file
    if (!file) {
      throw new Error('No file selected')
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File too large (max 50MB)')
    }

    // Build storage path
    const folder = category === 'admission' 
      ? 'admission' 
      : `followup-${yearLabel?.replace('-', '') || new Date().getFullYear()}`

    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/\s+/g, '-').toLowerCase()
    const path = `${childId}/${folder}/${timestamp}_${sanitizedFileName}`

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.CHILD_DOCUMENTS)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.CHILD_DOCUMENTS)
      .getPublicUrl(path)

    return {
      path,
      url: urlData.publicUrl,
      size: file.size
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('Document upload error:', error)
    toast.error(message)
    return null
  }
}

/**
 * List all documents for a child
 */
export async function listChildDocuments(
  childId: string,
  category?: DocumentCategory
): Promise<any[]> {
  try {
    const folder = category
      ? (category === 'admission' ? 'admission' : `followup-${new Date().getFullYear()}`)
      : ''

    const path = folder ? `${childId}/${folder}` : `${childId}`

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.CHILD_DOCUMENTS)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('List error:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to list documents:', error)
    return []
  }
}

/**
 * Get download URL for a document
 */
export function getDocumentUrl(path: string): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.CHILD_DOCUMENTS)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Download a document
 */
export async function downloadDocument(path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.CHILD_DOCUMENTS)
      .download(path)

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Download error:', error)
    toast.error('Download failed')
    return null
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.CHILD_DOCUMENTS)
      .remove([path])

    if (error) {
      throw error
    }

    toast.success('Document deleted')
    return true
  } catch (error) {
    console.error('Delete error:', error)
    toast.error('Failed to delete document')
    return false
  }
}

/**
 * Upload photo (for admission or follow-up)
 * Uses dedicated photo bucket
 */
export async function uploadPhoto(
  childId: string,
  file: File,
  category: DocumentCategory = 'admission'
): Promise<string | null> {
  try {
    if (file.size > 10 * 1024 * 1024) { // 10MB for photos
      throw new Error('Photo too large (max 10MB)')
    }

    const timestamp = Date.now()
    const path = `${childId}/${category}/${timestamp}_photo.jpg`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.CHILD_PHOTOS)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.CHILD_PHOTOS)
      .getPublicUrl(path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Photo upload error:', error)
    toast.error('Photo upload failed')
    return null
  }
}

/**
 * Create backup of entire database
 */
export async function createBackup(): Promise<{ success: boolean; fileName?: string }> {
  try {
    // Fetch all data that needs backup
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('*')

    if (childrenError) throw childrenError

    const { data: followups, error: followupsError } = await supabase
      .from('annual_followups')
      .select('*')

    if (followupsError) throw followupsError

    const { data: changelog, error: changelogError } = await supabase
      .from('change_log')
      .select('*')

    if (changelogError) throw changelogError

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      children: children || [],
      followups: followups || [],
      changelog: changelog || [],
      stats: {
        totalChildren: children?.length || 0,
        totalFollowups: followups?.length || 0,
        totalChanges: changelog?.length || 0
      }
    }

    // Convert to JSON
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    // Create file
    const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.BACKUPS)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    toast.success('Backup created successfully')
    return { success: true, fileName }
  } catch (error) {
    console.error('Backup error:', error)
    toast.error('Backup failed')
    return { success: false }
  }
}

/**
 * List all backups
 */
export async function listBackups(): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.BACKUPS)
      .list('', {
        limit: 50,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to list backups:', error)
    return []
  }
}

/**
 * Get storage usage and quota info
 */
export async function getStorageInfo(): Promise<{ used: number; quota: number; percent: number } | null> {
  try {
    // Supabase doesn't expose storage quota via API
    // This is a placeholder for future implementation
    // You can check usage in Supabase dashboard
    console.log('Check storage usage in Supabase dashboard')
    return null
  } catch (error) {
    console.error('Failed to get storage info:', error)
    return null
  }
}

/**
 * Initialize storage buckets (check if they exist)
 * Call this once on app startup
 */
export async function initializeStorage(): Promise<void> {
  try {
    // List buckets to verify they exist
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.warn('Could not verify storage buckets:', error)
      return
    }

    const bucketNames = buckets?.map(b => b.name) || []
    const requiredBuckets = Object.values(STORAGE_BUCKETS)
    const missingBuckets = requiredBuckets.filter(b => !bucketNames.includes(b))

    if (missingBuckets.length > 0) {
      console.warn('Missing storage buckets:', missingBuckets)
      console.warn('Please create these buckets in Supabase dashboard:')
      missingBuckets.forEach(b => console.warn(`  - ${b}`))
    }
  } catch (error) {
    console.warn('Storage initialization check failed:', error)
  }
}