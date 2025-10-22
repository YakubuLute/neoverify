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
  PENDING = 'pending',
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
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