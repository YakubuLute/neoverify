export interface Document {
  id: string;
  verificationId: string;
  originalFileName: string;
  canonicalHash: string;
  documentType: DocumentType;
  status: DocumentStatus;
  metadata: DocumentMetadata;
  blockchainRecord?: BlockchainRecord;
  forensicsResult?: ForensicsResult;
  qrCodeUrl?: string;
  issuerId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date;
  revocationReason?: string;
  // Document Management System fields
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  verificationStatus: VerificationStatus;
  tags: string[];
  permissions: DocumentPermissions;
  auditTrail: AuditEntry[];
  templateId?: string;
}

export enum DocumentType {
  DEGREE = 'degree',
  CERTIFICATE = 'certificate',
  LICENSE = 'license',
  TRANSCRIPT = 'transcript',
  ID_DOCUMENT = 'id_document',
  OTHER = 'other'
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  PENDING = 'pending',
  ACTIVE = 'active',
  REVOKED = 'revoked'
}

export interface DocumentMetadata {
  title?: string;
  description?: string;
  recipientName?: string;
  issueDate?: Date;
  expiryDate?: Date;
  customFields?: Record<string, any>;
}

export interface BlockchainRecord {
  transactionHash: string;
  blockNumber: number;
  network: string;
  timestamp: Date;
  gasUsed?: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface ForensicsResult {
  riskScore: number; // 0-100
  status: 'genuine' | 'suspicious' | 'invalid';
  flags: ForensicsFlag[];
  modelVersion: string;
  processingTime: number;
  artifacts?: ForensicsArtifact[];
}

export interface ForensicsFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
}

export interface ForensicsArtifact {
  type: 'heatmap' | 'diff' | 'metadata';
  url: string;
  description: string;
}

export interface VerificationRequest {
  type: 'file' | 'hash' | 'id';
  file?: File;
  hash?: string;
  verificationId?: string;
  runForensics?: boolean;
}

export interface VerificationResult {
  document?: Document;
  status: 'genuine' | 'suspicious' | 'invalid' | 'not_found';
  forensicsResult?: ForensicsResult;
  evidence: VerificationEvidence;
  timestamp: Date;
}

export interface VerificationEvidence {
  transactionHash?: string;
  blockNumber?: number;
  network?: string;
  issuerOrganization?: string;
  verificationReceiptUrl?: string;
}

export interface BulkIssuanceRequest {
  documents: BulkDocumentItem[];
  documentType: DocumentType;
  template?: string;
}

export interface BulkDocumentItem {
  file: File;
  metadata: DocumentMetadata;
}

export interface BulkIssuanceResult {
  jobId: string;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  results: BulkItemResult[];
}

export interface BulkItemResult {
  fileName: string;
  status: 'success' | 'error';
  documentId?: string;
  verificationId?: string;
  error?: string;
}

// Document Management System Models

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  isActive: boolean;
  fields: TemplateField[];
  validationRules: ValidationRule[];
  previewUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  organizationId: string;
}

export interface TemplateField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  defaultValue?: any;
  validation?: FieldValidation;
  position: { x: number; y: number };
  placeholder?: string;
  options?: string[]; // For dropdown/select fields
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  EMAIL = 'email',
  PHONE = 'phone',
  DROPDOWN = 'dropdown',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  FILE = 'file'
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  required?: boolean;
  customMessage?: string;
}

export interface ValidationRule {
  id: string;
  fieldId: string;
  type: ValidationType;
  value: any;
  message: string;
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'minLength',
  MAX_LENGTH = 'maxLength',
  PATTERN = 'pattern',
  MIN_VALUE = 'minValue',
  MAX_VALUE = 'maxValue',
  CUSTOM = 'custom'
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface DocumentFilters {
  documentType?: DocumentType[];
  status?: DocumentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  issuer?: string[];
  tags?: string[];
  verificationStatus?: VerificationStatus[];
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface DocumentPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canDownload: boolean;
  sharedWith?: SharedUser[];
}

export interface SharedUser {
  userId: string;
  email: string;
  permissions: SharePermissions;
  sharedAt: Date;
  expiresAt?: Date;
}

export interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canDownload: boolean;
}

export interface AuditEntry {
  id: string;
  documentId: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  previousStatus?: DocumentStatus;
  newStatus?: DocumentStatus;
  reason?: string;
}

export enum AuditAction {
  CREATED = 'created',
  VIEWED = 'viewed',
  UPDATED = 'updated',
  DELETED = 'deleted',
  SHARED = 'shared',
  DOWNLOADED = 'downloaded',
  VERIFIED = 'verified',
  REVOKED = 'revoked',
  PERMISSION_CHANGED = 'permission_changed',
  STATUS_CHANGED = 'status_changed',
  VERIFICATION_STARTED = 'verification_started',
  VERIFICATION_COMPLETED = 'verification_completed',
  VERIFICATION_FAILED = 'verification_failed'
}

export interface DocumentUploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: UploadStatus;
  error?: string;
  documentId?: string;
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface BulkAction {
  type: BulkActionType;
  documentIds: string[];
  data?: any;
}

export enum BulkActionType {
  DELETE = 'delete',
  UPDATE_STATUS = 'update_status',
  ADD_TAGS = 'add_tags',
  REMOVE_TAGS = 'remove_tags',
  EXPORT = 'export',
  SHARE = 'share'
}

export interface ExportFormat {
  type: 'csv' | 'excel' | 'pdf';
  includeMetadata: boolean;
  includeAuditTrail: boolean;
}

export interface DocumentSearchResult {
  documents: Document[];
  totalCount: number;
  facets: SearchFacets;
  suggestions?: string[];
}

export interface SearchFacets {
  documentTypes: FacetCount[];
  statuses: FacetCount[];
  issuers: FacetCount[];
  tags: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

// Status Tracking and Verification Models

export interface DocumentStatusHistory {
  id: string;
  documentId: string;
  previousStatus: DocumentStatus;
  newStatus: DocumentStatus;
  reason?: string;
  triggeredBy: StatusTrigger;
  userId?: string;
  userEmail?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum StatusTrigger {
  MANUAL = 'manual',
  AUTOMATED = 'automated',
  VERIFICATION_RESULT = 'verification_result',
  SYSTEM = 'system',
  SCHEDULED = 'scheduled'
}

export interface StatusTransition {
  from: DocumentStatus;
  to: DocumentStatus;
  allowed: boolean;
  requiresReason: boolean;
  requiresPermission?: string;
  conditions?: StatusCondition[];
}

export interface StatusCondition {
  type: 'user_role' | 'document_age' | 'verification_status' | 'custom';
  value: any;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
}

export interface VerificationProgress {
  documentId: string;
  stage: VerificationStage;
  progress: number; // 0-100
  message: string;
  startedAt: Date;
  estimatedCompletion?: Date;
  details?: VerificationStageDetail[];
}

export enum VerificationStage {
  QUEUED = 'queued',
  PREPROCESSING = 'preprocessing',
  FORENSIC_ANALYSIS = 'forensic_analysis',
  BLOCKCHAIN_VERIFICATION = 'blockchain_verification',
  SIGNATURE_VALIDATION = 'signature_validation',
  METADATA_EXTRACTION = 'metadata_extraction',
  FINAL_VALIDATION = 'final_validation',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface VerificationStageDetail {
  stage: VerificationStage;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  message: string;
  error?: VerificationError;
}

export interface VerificationError {
  code: string;
  message: string;
  details?: string;
  remediation?: RemediationStep[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RemediationStep {
  id: string;
  title: string;
  description: string;
  action?: RemediationAction;
  priority: number;
}

export interface RemediationAction {
  type: 'retry' | 'manual_review' | 'contact_support' | 'reupload' | 'update_metadata';
  label: string;
  endpoint?: string;
  parameters?: Record<string, any>;
}

export interface VerificationHistoryEntry {
  id: string;
  documentId: string;
  verificationId: string;
  status: VerificationStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  triggeredBy: string; // user ID or 'system'
  result?: VerificationResult;
  error?: VerificationError;
  forensicsEnabled: boolean;
  metadata?: Record<string, any>;
}

export interface StatusNotification {
  id: string;
  documentId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export enum NotificationType {
  STATUS_CHANGE = 'status_change',
  VERIFICATION_COMPLETE = 'verification_complete',
  VERIFICATION_FAILED = 'verification_failed',
  DOCUMENT_EXPIRED = 'document_expired',
  PERMISSION_CHANGED = 'permission_changed',
  BULK_OPERATION_COMPLETE = 'bulk_operation_complete'
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  DISMISSED = 'dismissed'
}