import { z } from 'zod';

// Document verification status enumeration
export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
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
}

// Document metadata interface
export interface DocumentMetadata {
  fileSize: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  pages?: number;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  creationDate?: Date;
  modificationDate?: Date;
  producer?: string;
  creator?: string;
  extractedText?: string;
  language?: string;
  checksum: string;
  uploadedFrom?: string;
  clientInfo?: {
    userAgent?: string;
    ipAddress?: string;
  };
}

// Verification results interface
export interface VerificationResults {
  aiForensics?: {
    authenticity: number;
    tampering: number;
    confidence: number;
    details: any;
    completedAt: Date;
  };
  blockchain?: {
    transactionHash: string;
    blockNumber?: number;
    timestamp: Date;
    status: 'pending' | 'confirmed' | 'failed';
  };
  ipfs?: {
    hash: string;
    size: number;
    timestamp: Date;
  };
  overall?: {
    score: number;
    status: 'authentic' | 'suspicious' | 'tampered' | 'inconclusive';
    summary: string;
  };
}

// Document sharing settings interface
export interface SharingSettings {
  isPublic: boolean;
  allowDownload: boolean;
  expiresAt?: Date;
  password?: string;
  allowedEmails?: string[];
  shareToken?: string;
}

// Document interface
export interface Document {
  id: string;
  userId: string;
  organizationId?: string;
  filename: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  size: number;
  hash: string;
  ipfsHash?: string;
  documentType: DocumentType;
  metadata: DocumentMetadata;
  verificationStatus: VerificationStatus;
  verificationResults?: VerificationResults;
  sharingSettings: SharingSettings;
  tags: string[];
  description?: string;
  isPublic: boolean;
  downloadCount: number;
  viewCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Document upload request interface
export interface DocumentUploadRequest {
  file: File;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  sharingSettings?: Partial<SharingSettings>;
  expiresAt?: Date;
}

// Document update request interface
export interface DocumentUpdateRequest {
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  sharingSettings?: Partial<SharingSettings>;
  expiresAt?: Date;
}

// Document search/filter interface
export interface DocumentFilters {
  search?: string;
  documentType?: DocumentType;
  verificationStatus?: VerificationStatus;
  tags?: string[];
  userId?: string;
  organizationId?: string;
  isPublic?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  sizeMin?: number;
  sizeMax?: number;
}

// Document list response interface
export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Document verification request interface
export interface DocumentVerificationRequest {
  documentId: string;
  verificationTypes?: ('aiForensics' | 'blockchain' | 'ipfs')[];
  priority?: 'low' | 'normal' | 'high';
}

// Document verification job interface
export interface DocumentVerificationJob {
  id: string;
  documentId: string;
  status: VerificationStatus;
  progress: number;
  estimatedCompletion?: Date;
  results?: Partial<VerificationResults>;
  createdAt: Date;
  updatedAt: Date;
}

// Document share request interface
export interface DocumentShareRequest {
  documentId: string;
  settings: Partial<SharingSettings>;
}

// Document share response interface
export interface DocumentShareResponse {
  shareUrl: string;
  shareToken: string;
  expiresAt?: Date;
}

// Document download request interface
export interface DocumentDownloadRequest {
  documentId: string;
  shareToken?: string;
}

// Document statistics interface
export interface DocumentStatistics {
  totalDocuments: number;
  totalSize: number;
  verifiedDocuments: number;
  pendingVerifications: number;
  failedVerifications: number;
  documentsByType: Record<DocumentType, number>;
  documentsByStatus: Record<VerificationStatus, number>;
  uploadsThisMonth: number;
  verificationsThisMonth: number;
}

// Zod Schemas for Runtime Validation
export const DocumentMetadataSchema = z.object({
  fileSize: z.number().min(0),
  mimeType: z.string(),
  dimensions: z.object({
    width: z.number(),
    height: z.number()
  }).optional(),
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
  clientInfo: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional()
  }).optional()
});

export const VerificationResultsSchema = z.object({
  aiForensics: z.object({
    authenticity: z.number().min(0).max(1),
    tampering: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    details: z.any(),
    completedAt: z.string().datetime()
  }).optional(),
  blockchain: z.object({
    transactionHash: z.string(),
    blockNumber: z.number().optional(),
    timestamp: z.string().datetime(),
    status: z.enum(['pending', 'confirmed', 'failed'])
  }).optional(),
  ipfs: z.object({
    hash: z.string(),
    size: z.number(),
    timestamp: z.string().datetime()
  }).optional(),
  overall: z.object({
    score: z.number().min(0).max(1),
    status: z.enum(['authentic', 'suspicious', 'tampered', 'inconclusive']),
    summary: z.string()
  }).optional()
});

export const SharingSettingsSchema = z.object({
  isPublic: z.boolean(),
  allowDownload: z.boolean(),
  expiresAt: z.string().datetime().optional(),
  password: z.string().optional(),
  allowedEmails: z.array(z.string().email()).optional(),
  shareToken: z.string().optional()
});

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  filename: z.string(),
  originalName: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  size: z.number().min(0),
  hash: z.string(),
  ipfsHash: z.string().optional(),
  documentType: z.nativeEnum(DocumentType),
  metadata: DocumentMetadataSchema,
  verificationStatus: z.nativeEnum(VerificationStatus),
  verificationResults: VerificationResultsSchema.optional(),
  sharingSettings: SharingSettingsSchema,
  tags: z.array(z.string()),
  description: z.string().optional(),
  isPublic: z.boolean(),
  downloadCount: z.number().min(0),
  viewCount: z.number().min(0),
  lastAccessedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

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
});

export const DocumentListResponseSchema = z.object({
  documents: z.array(DocumentSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
});

export const DocumentVerificationJobSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  status: z.nativeEnum(VerificationStatus),
  progress: z.number().min(0).max(100),
  estimatedCompletion: z.string().datetime().optional(),
  results: VerificationResultsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

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
});