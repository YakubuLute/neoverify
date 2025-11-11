
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod'

// Audit action enumeration
export enum AuditAction {
  VIEWED = 'viewed',
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  SHARED = 'shared',
  DOWNLOADED = 'downloaded',
  UPLOADED = 'uploaded',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
  REVOKED = 'revoked',
  PERMISSION_CHANGED = 'permission_changed',
  STATUS_CHANGED = 'status_changed',
  VERIFICATION_STARTED = 'verification_started',
  VERIFICATION_COMPLETED = 'verification_completed',
  VERIFICATION_FAILED = 'verification_failed'
}

// Document status enumeration
export enum DocumentStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  PROCESSING = 'processing',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  UPLOADED = 'uploaded'
}

// Document verification status enumeration
export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED'
}

// Document type enumeration
export enum DocumentType {
  PDF = 'pdf',
  IMAGE = 'image',
  WORD = 'word',
  EXCEL = 'excel',
  POWERPOINT = 'powerpoint',
  TEXT = 'text',
  OTHER = 'other',
  // Zod Schemas for Runtime Validation
  DEGREE = 'DEGREE',
  CERTIFICATE = 'CERTIFICATE',
  LICENSE = 'LICENSE',
  TRANSCRIPT = 'TRANSCRIPT',
  ID_DOCUMENT = 'ID_DOCUMENT'
}

// Document metadata interface
export interface DocumentMetadata {
  expiryDate: any
  fileSize: number
  mimeType: string
  dimensions?: {
    width: number
    height: number
  }
  pages?: number
  author?: string
  title?: string
  subject?: string
  keywords?: string[]
  creationDate?: Date
  modificationDate?: Date
  producer?: string
  creator?: string
  extractedText?: string
  language?: string
  checksum: string
  uploadedFrom?: string
  clientInfo?: {
    userAgent?: string
    ipAddress?: string
  }
  issueDate?: Date
  recipientName?: string
  description?: string
  customFields?: Record<string, any>
}

// Verification results interface
export interface VerificationResults {
  aiForensics?: {
    authenticity: number
    tampering: number
    confidence: number
    details: any
    completedAt: Date
  }
  blockchain?: {
    transactionHash: string
    blockNumber?: number
    timestamp: Date
    status: 'pending' | 'confirmed' | 'failed'
  }
  ipfs?: {
    hash: string
    size: number
    timestamp: Date
  }
  overall?: {
    score: number
    status: 'authentic' | 'suspicious' | 'tampered' | 'inconclusive'
    summary: string
  }
}

// Verification request union type used by services
export type VerificationRequest =
  | { type: 'file'; file: File; runForensics?: boolean }
  | { type: 'hash'; hash: string; runForensics?: boolean }
  | { type: 'id'; verificationId: string; runForensics?: boolean };

// Document sharing settings interface
export interface SharingSettings {
  isPublic: boolean
  allowDownload: boolean
  expiresAt?: Date
  password?: string
  allowedEmails?: string[]
  shareToken?: string
}

// Document interface
export interface Document {
  id: string
  userId: string
  title: string
  forensicsResult?: ForensicsResult
  organizationId?: string
  filename: string
  originalName: string
  originalFileName?: string // Alias for originalName for backward compatibility
  filePath: string
  mimeType: string
  size: number
  fileSize?: number // Alias for size for backward compatibility
  hash: string
  canonicalHash: string // Hash used for verification
  ipfsHash?: string
  documentType: DocumentType
  metadata: DocumentMetadata
  status: DocumentStatus
  verificationStatus: VerificationStatus
  verificationResults?: VerificationResults
  verifiedAt?: Date // When the document was verified
  blockchainRecord?: BlockchainRecord // Blockchain verification record
  sharingSettings: SharingSettings
  tags: string[]
  description?: string
  isPublic: boolean
  downloadCount: number
  viewCount: number
  lastAccessedAt?: Date
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  uploadedAt?: Date // When the document was uploaded
  thumbnailUrl?: string // URL to document thumbnail
  // Additional properties for permissions
  uploadedBy?: string // User ID who uploaded the document
  permissions?: DocumentPermissions
}
export interface DocumentModelResponse extends Document {
  data?: string[];
}

// Document upload request interface
export interface DocumentUploadRequest {
  file: File
  description?: string
  tags?: string[]
  isPublic?: boolean
  sharingSettings?: Partial<SharingSettings>
  expiresAt?: Date
}

// Document update request interface
export interface DocumentUpdateRequest {
  description?: string
  tags?: string[]
  isPublic?: boolean
  sharingSettings?: Partial<SharingSettings>
  expiresAt?: Date
}

// Document search/filter interface
export interface DocumentFilters {
  search?: string
  documentType?: DocumentType | DocumentType[]
  verificationStatus?: VerificationStatus | VerificationStatus[]
  status?: DocumentStatus | DocumentStatus[]
  tags?: string[]
  userId?: string
  organizationId?: string
  isPublic?: boolean
  dateFrom?: Date
  dateTo?: Date
  dateRange?: { start: Date; end: Date }
  sizeMin?: number
  sizeMax?: number
  issuer?: string[]
}

// Document list response interface
export interface DocumentListResponse {
  documents: Document[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Document verification request interface
export interface DocumentVerificationRequest {
  documentId: string
  verificationTypes?: ('aiForensics' | 'blockchain' | 'ipfs')[]
  priority?: 'low' | 'normal' | 'high'
}

// Document verification job interface
export interface DocumentVerificationJob {
  id: string
  documentId: string
  status: VerificationStatus
  progress: number
  estimatedCompletion?: Date
  results?: Partial<VerificationResults>
  createdAt: Date
  updatedAt: Date
}

// Document share request interface
export interface DocumentShareRequest {
  documentId: string
  settings: Partial<SharingSettings>
}

// Document share response interface
export interface DocumentShareResponse {
  shareUrl: string
  shareToken: string
  expiresAt?: Date
}

// Document download request interface
export interface DocumentDownloadRequest {
  documentId: string
  shareToken?: string
}

// Document statistics interface
export interface DocumentStatistics {
  totalDocuments: number
  totalSize: number
  verifiedDocuments: number
  pendingVerifications: number
  failedVerifications: number
  documentsByType: Record<DocumentType, number>
  documentsByStatus: Record<VerificationStatus, number>
  uploadsThisMonth: number
  verificationsThisMonth: number
}

// Document permissions interface
export interface DocumentPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canDownload: boolean
  sharedWith?: SharedUser[]
}

// Shared user interface
export interface SharedUser {
  userId: string
  email: string
  name: string
  permissions: {
    canView: boolean
    canEdit: boolean
    canDownload: boolean
  }
  sharedAt: Date
  expiresAt?: Date
}

// Verification progress interface
export interface VerificationProgress {
  documentId: string
  status: VerificationStatus
  progress: number // 0-100
  stage: VerificationStage // Current stage
  currentStage: string
  message: string // Current progress message
  stages: VerificationStageDetail[]
  details?: VerificationStageDetail[]
  startedAt: Date
  estimatedCompletion?: Date
  completedAt?: Date
  error?: string
}

// Verification stage detail interface
export interface VerificationStageDetail {
  name: string
  stage: VerificationStage
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  progress: number // 0-100
  message: string
  startedAt?: Date
  completedAt?: Date
  error?: VerificationError
  details?: any
}

// Verification history entry interface
export interface VerificationHistoryEntry {
  id: string
  verificationId: string
  documentId: string
  status: VerificationStatus
  startedAt: Date
  completedAt?: Date
  duration?: number
  error?: VerificationError
  results?: VerificationResults
  triggeredBy: string
  metadata?: any
}

// Verification error interface
export interface VerificationError {
  code: string
  message: string
  details?: any
  severity: 'low' | 'medium' | 'high'
  category: 'technical' | 'validation' | 'security' | 'network'
}

// Remediation step interface
export interface RemediationStep {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  category: string
  estimatedTime?: number
  action?: {
    type: string
    label: string
    parameters: any
  }
  isCompleted: boolean
  completedAt?: Date
}

// Blockchain record interface
export interface BlockchainRecord {
  transactionHash: string
  blockNumber: number
  network: string
  timestamp: Date
  status: 'pending' | 'confirmed' | 'failed'
  gasUsed?: number
  gasPrice?: string
  contractAddress?: string
}

// Forensics result interface
export interface ForensicsResult {
  status: 'genuine' | 'suspicious' | 'invalid'
  riskScore: number
  confidence: number
  processingTime: number // Processing time in milliseconds
  modelVersion: string // Version of the AI model used
  flags: ForensicsFlag[]
  analysis: {
    metadata: any
    visual: any
    statistical: any
  }
  completedAt: Date
}

// Forensics flag interface
export interface ForensicsFlag {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  confidence: number
  location?: {
    page?: number
    coordinates?: { x: number; y: number; width: number; height: number }
  }
}

// Document status history interface
export interface DocumentStatusHistory {
  id: string
  documentId: string
  previousStatus: DocumentStatus
  newStatus: DocumentStatus
  reason?: string
  triggeredBy: StatusTrigger
  userId?: string
  metadata?: Record<string, any>
  createdAt: Date
}

// Status transition interface
export interface StatusTransition {
  from: DocumentStatus
  to: DocumentStatus
  label: string
  description?: string
  requiresReason: boolean
  allowed: boolean
  allowedRoles?: string[]
  conditions?: Record<string, any>
}

// Status trigger enumeration
export enum StatusTrigger {
  MANUAL = 'manual',
  SYSTEM = 'system',
  SCHEDULED = 'scheduled',
  API = 'api',
  WEBHOOK = 'webhook',
  AUTOMATED = 'automated',
  VERIFICATION_RESULT = 'verification_result'
}

// Status notification interface
export interface StatusNotification {
  id: string
  userId: string
  documentId: string
  type: NotificationType
  title: string
  message: string
  status: 'read' | 'unread'
  priority: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
  createdAt: Date
  readAt?: Date
  expiresAt?: Date
}

// Notification type enumeration
export enum NotificationType {
  STATUS_CHANGED = 'status_changed',
  VERIFICATION_COMPLETED = 'verification_completed',
  VERIFICATION_FAILED = 'verification_failed',
  DOCUMENT_SHARED = 'document_shared',
  DOCUMENT_EXPIRED = 'document_expired',
  SYSTEM_ALERT = 'system_alert'
}

// Verification stage enumeration
export enum VerificationStage {
  PENDING = 'pending',
  QUEUED = 'queued',
  PREPROCESSING = 'preprocessing',
  FORENSIC_ANALYSIS = 'forensic_analysis',
  BLOCKCHAIN_VERIFICATION = 'blockchain_verification',
  SIGNATURE_VALIDATION = 'signature_validation',
  METADATA_EXTRACTION = 'metadata_extraction',
  FINAL_VALIDATION = 'final_validation',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Zod Schemas for Runtime Validation
export const DocumentMetadataSchema = z.object({
  fileSize: z.number().min(0),
  mimeType: z.string(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number()
    })
    .optional(),
  pages: z.number().optional(),
  author: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  creationDate: z.string().datetime().optional(),
  modificationDate: z.string().datetime().optional(),
  producer: z.string().optional(),
  creator: z.string().optional(),
  extractedText: z.string().optional(),
  language: z.string().optional(),
  checksum: z.string(),
  uploadedFrom: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  clientInfo: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional()
    })
    .optional()
})

export const VerificationResultsSchema = z.object({
  aiForensics: z
    .object({
      authenticity: z.number().min(0).max(1),
      tampering: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
      details: z.any(),
      completedAt: z.string().datetime()
    })
    .optional(),
  blockchain: z
    .object({
      transactionHash: z.string(),
      blockNumber: z.number().optional(),
      timestamp: z.string().datetime(),
      status: z.enum(['pending', 'confirmed', 'failed'])
    })
    .optional(),
  ipfs: z
    .object({
      hash: z.string(),
      size: z.number(),
      timestamp: z.string().datetime()
    })
    .optional(),
  overall: z
    .object({
      score: z.number().min(0).max(1),
      status: z.enum(['authentic', 'suspicious', 'tampered', 'inconclusive']),
      summary: z.string()
    })
    .optional()
})

export const SharingSettingsSchema = z.object({
  isPublic: z.boolean(),
  allowDownload: z.boolean(),
  expiresAt: z.string().datetime().optional(),
  password: z.string().optional(),
  allowedEmails: z.array(z.string().email()).optional(),
  shareToken: z.string().optional()
})

export const SharedUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  permissions: z.object({
    canView: z.boolean(),
    canEdit: z.boolean(),
    canDownload: z.boolean()
  }),
  sharedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional()
})

export const DocumentPermissionsSchema = z.object({
  canView: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canShare: z.boolean(),
  canDownload: z.boolean(),
  sharedWith: z.array(SharedUserSchema).optional()
})

// Blockchain record schema
export const BlockchainRecordSchema = z.object({
  transactionHash: z.string(),
  blockNumber: z.number(),
  network: z.string(),
  timestamp: z.string().datetime(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  gasUsed: z.number().optional(),
  gasPrice: z.string().optional(),
  contractAddress: z.string().optional()
})

// Forensics result schema
export const ForensicsResultSchema = z.object({
  status: z.enum(['genuine', 'suspicious', 'invalid']),
  riskScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  processingTime: z.number().min(0),
  modelVersion: z.string(),
  flags: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      confidence: z.number().min(0).max(100),
      location: z
        .object({
          page: z.number().optional(),
          coordinates: z
            .object({
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number()
            })
            .optional()
        })
        .optional()
    })
  ),
  analysis: z.object({
    metadata: z.any(),
    visual: z.any(),
    statistical: z.any()
  }),
  completedAt: z.string().datetime()
})

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  organizationId: z.string().uuid().optional(),
  filename: z.string(),
  originalName: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  size: z.number().min(0),
  hash: z.string(),
  canonicalHash: z.string(),
  ipfsHash: z.string().optional(),
  documentType: z.nativeEnum(DocumentType),
  metadata: DocumentMetadataSchema,
  status: z.nativeEnum(DocumentStatus),
  verificationStatus: z.nativeEnum(VerificationStatus),
  verificationResults: VerificationResultsSchema.optional(),
  verifiedAt: z.string().datetime().optional(),
  blockchainRecord: BlockchainRecordSchema.optional(),
  forensicsResult: ForensicsResultSchema.optional(),
  sharingSettings: SharingSettingsSchema,
  tags: z.array(z.string()),
  description: z.string().optional(),
  isPublic: z.boolean(),
  downloadCount: z.number().min(0),
  viewCount: z.number().min(0),
  lastAccessedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  uploadedBy: z.string().uuid().optional(),
  permissions: DocumentPermissionsSchema.optional()
})

export const DocumentFiltersSchema = z.object({
  search: z.string().optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  verificationStatus: z.nativeEnum(VerificationStatus).optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sizeMin: z.number().min(0).optional(),
  sizeMax: z.number().min(0).optional()
})

export const DocumentListResponseSchema = z.object({
  documents: z.array(DocumentSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})

export const DocumentVerificationJobSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  status: z.nativeEnum(VerificationStatus),
  progress: z.number().min(0).max(100),
  estimatedCompletion: z.string().datetime().optional(),
  results: VerificationResultsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Verification error schema
export const VerificationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  severity: z.enum(['low', 'medium', 'high']),
  category: z.enum(['technical', 'validation', 'security', 'network'])
})

export const VerificationStageDetailSchema = z.object({
  name: z.string(),
  stage: z.nativeEnum(VerificationStage),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  progress: z.number().min(0).max(100),
  message: z.string(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: VerificationErrorSchema.optional(),
  details: z.any().optional()
})

export const VerificationProgressSchema = z.object({
  documentId: z.string().uuid(),
  status: z.nativeEnum(VerificationStatus),
  progress: z.number().min(0).max(100),
  stage: z.nativeEnum(VerificationStage),
  currentStage: z.string(),
  message: z.string(),
  stages: z.array(VerificationStageDetailSchema),
  details: z.array(VerificationStageDetailSchema).optional(),
  startedAt: z.string().datetime(),
  estimatedCompletion: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional()
})

export const DocumentStatisticsSchema = z.object({
  totalDocuments: z.number(),
  totalSize: z.number(),
  verifiedDocuments: z.number(),
  pendingVerifications: z.number(),
  failedVerifications: z.number(),
  documentsByType: z.record(z.nativeEnum(DocumentType), z.number()),
  documentsByStatus: z.record(z.nativeEnum(VerificationStatus), z.number()),
  uploadsThisMonth: z.number(),
  verificationsThisMonth: z.number()
})

// Bulk operations
export enum BulkActionType {
  DELETE = 'delete',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  VERIFY = 'verify',
  EXPORT = 'export',
  SHARE = 'share',
  TAG = 'tag',
  MOVE = 'move',
  UPDATE_STATUS = 'update_status',
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags'
}

export interface BulkAction {
  type: BulkActionType
  documentIds: string[]
  parameters?: Record<string, any>
  data?: any // Additional data for the action
}

// Export formats
export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  ZIP = 'zip',
  EXCEL = 'excel'
}

export enum ReportType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  CUSTOM = 'custom'
}

// Export configuration interface
export interface ExportConfig {
  type: ExportFormat | string
  includeMetadata?: boolean
  includeAuditTrail?: boolean
}

// Upload progress
export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface DocumentUploadProgress {
  id: string
  fileId?: string // Unique file identifier
  filename: string
  fileName?: string // Alias for filename
  size: number
  uploaded: number
  progress: number // 0-100
  status: UploadStatus
  error?: string
  startedAt: Date
  completedAt?: Date
}

// Document templates
export interface DocumentTemplate {
  id: string
  organizationId: string
  name: string
  description?: string
  documentType: DocumentType
  fields: TemplateField[]
  validationRules: ValidationRule[]
  isActive: boolean
  version: string // Changed to string to support semantic versioning
  createdBy: string
  createdAt: Date
  updatedAt: Date
  category?: string
  previewUrl?: string
  usageCount?: number
}

export interface TemplateField {
  id: string
  name: string
  label: string
  type: FieldType
  required: boolean
  defaultValue?: any
  validation?: FieldValidation
  options?: string[] // For select/radio fields
  placeholder?: string
  helpText?: string
  order: number
  position?: { x: number; y: number } // For visual positioning
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  FILE = 'file',
  DROPDOWN = 'dropdown', // Alias for SELECT
  PHONE = 'phone'
}

export interface ValidationRule {
  id: string
  fieldId: string
  type: ValidationType
  value: any
  message: string
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'minLength',
  MAX_LENGTH = 'maxLength',
  PATTERN = 'pattern',
  MIN_VALUE = 'minValue',
  MAX_VALUE = 'maxValue',
  EMAIL = 'email',
  URL = 'url',
  CUSTOM = 'custom'
}

export interface FieldValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  minValue?: number
  maxValue?: number
  min?: number // Alias for minValue
  max?: number // Alias for maxValue
  custom?: (value: any) => boolean | string
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: string // Changed to string to support semantic versioning
  changes: string
  createdBy: string
  createdAt: Date
  isActive?: boolean
}

// Share permissions
export interface SharePermissions {
  canView: boolean
  canEdit: boolean
  canDownload: boolean
  canShare: boolean
  expiresAt?: Date
}

// Additional missing types
export interface AuditEntry {
  id: string
  documentId: string
  action: AuditAction
  userId: string
  timestamp: Date
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface BulkIssuanceRequest {
  documents: any[]
  templateId?: string
  organizationId: string
  documentType: DocumentType
  template:DocumentTemplate | null
}

export interface BulkIssuanceResult {
  success: boolean
  processedCount: number
  failedCount: number
  results: any[]
}
