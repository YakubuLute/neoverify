# NEOVERIFY ARCHITECTURE 

        
          ┌────────────────────┐
          │ End Users / Clients │
          │ (Unis, Banks, HR)   │
          └─────────┬──────────┘
                    │
                    ▼
      ┌───────────────────────────┐
      │ Frontend                  │
      │ Web (React/Next.js)       │
      │ Mobile (React Native)     │
      └─────────┬─────────────────┘
                │ API Calls
                ▼
      ┌───────────────────────────┐
      │ Backend (Node.js + Nest)  │
      │ - Auth & APIs             │
      │ - Orchestrates Services   │
      └──┬─────┬─────┬─────┬─────┘
         │     │     │     │
         ▼     ▼     ▼     ▼
 ┌────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────────────┐
 │ Blockchain │ │ AI Forensics  │ │ Database    │ │ Secure File Storage │
 │ (Ethereum/ │ │ (Python ML)   │ │ (Postgres / │ │ (AWS S3 / Azure)    │
 │ Polygon)   │ │ Detects fakes │ │ MongoDB)    │ │ Docs & Images       │
 └────────────┘ └──────────────┘ └─────────────┘ └─────────────────────┘
    (Hashes)        (Tampering)       (Users,         (Original files)
                                      Metadata)


# Document Verification Platform - Software Specification

## 1. Executive Summary

### 1.1 Project Overview
A hybrid document verification platform combining AI-powered forensics analysis with blockchain-based document registry. The system provides comprehensive document authenticity verification for organizations across multiple industries.

### 1.2 Core Components
- **AI Document Forensics Service**: Machine learning models for detecting document tampering
- **Blockchain Registry Service**: Immutable document registration and verification
- **Unified Verification API**: Single endpoint combining both verification methods
- **Web Dashboard**: Angular-based administration and analytics interface
- **Mobile SDK**: Integration toolkit for third-party applications

## 2. System Architecture

### 2.1 High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Angular Web   │    │   Mobile Apps    │    │  Third-Party    │
│   Dashboard     │    │   (SDK)          │    │  Integrations   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   API Gateway       │
                    │   (Node.js/Express) │
                    └─────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ AI Forensics    │    │ Blockchain      │    │ User Management │
│ Service         │    │ Registry        │    │ Service         │
│ (Python/Django) │    │ Service         │    │ (Node.js)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ML Models       │    │ Blockchain      │    │ PostgreSQL      │
│ Storage         │    │ Network         │    │ Database        │
│ (Redis/File)    │    │ (Ethereum/      │    │                 │
│                 │    │ Polygon)        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 Technology Stack

#### Frontend
- **Framework**: Angular 17+
- **UI Library**: Angular Material
- **State Management**: NgRx
- **HTTP Client**: Angular HttpClient
- **File Upload**: ng-file-upload
- **Charts**: Chart.js/ng2-charts

#### Backend Services

##### API Gateway (Node.js)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Authentication**: JWT + Passport.js
- **Rate Limiting**: express-rate-limit
- **File Processing**: Multer
- **API Documentation**: Swagger/OpenAPI

##### AI Forensics Service (Python/Django)
- **Framework**: Django 4.2+
- **API**: Django REST Framework
- **ML Libraries**: 
  - TensorFlow/Keras
  - OpenCV
  - PIL (Pillow)
  - NumPy
  - scikit-learn
- **Task Queue**: Celery + Redis
- **File Storage**: AWS S3 or local storage

##### Blockchain Registry Service (Node.js)
- **Framework**: Express.js
- **Blockchain**: Ethereum/Polygon
- **Web3 Library**: ethers.js
- **Smart Contracts**: Solidity
- **IPFS**: ipfs-http-client

##### User Management Service (Node.js)
- **Framework**: Express.js
- **Database ORM**: Prisma or Sequelize
- **Authentication**: bcrypt + JWT
- **Email**: Nodemailer

#### Databases & Storage
- **Primary Database**: PostgreSQL 14+
- **Cache/Queue**: Redis 7+
- **File Storage**: AWS S3 or MinIO
- **Blockchain Storage**: IPFS

## 3. Detailed Component Specifications

### 3.1 API Gateway Service

#### 3.1.1 Core Responsibilities
- Request routing to appropriate microservices
- Authentication and authorization
- Rate limiting and throttling
- Request/response transformation
- API versioning
- Logging and monitoring

#### 3.1.2 Key Endpoints
```javascript
// Authentication
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh

// Document Verification
POST /api/v1/verify/document
GET /api/v1/verify/status/{verificationId}
GET /api/v1/verify/history

// Blockchain Registry
POST /api/v1/registry/register
GET /api/v1/registry/lookup/{documentId}
GET /api/v1/registry/verify/{hash}

// User Management
GET /api/v1/users/profile
PUT /api/v1/users/profile
GET /api/v1/users/usage-stats
```

#### 3.1.3 Middleware Stack
```javascript
// middleware/auth.js
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  message: 'Too many requests from this IP'
});

module.exports = {
  general: createRateLimiter(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  verification: createRateLimiter(60 * 1000, 10)    // 10 verifications per minute
};
```

### 3.2 AI Forensics Service (Python/Django)

#### 3.2.1 Core Functionality
- Document image preprocessing
- Feature extraction for forgery detection
- ML model inference
- Confidence scoring
- Detailed analysis reporting

#### 3.2.2 Django Project Structure
```
ai_forensics/
├── manage.py
├── ai_forensics/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── verification/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── ml_models/
│       ├── forgery_detector.py
│       ├── signature_analyzer.py
│       └── text_consistency_checker.py
├── document_processor/
│   ├── image_preprocessor.py
│   ├── feature_extractor.py
│   └── utils.py
└── requirements.txt
```

#### 3.2.3 Key Models and Views
```python
# verification/models.py
from django.db import models
import uuid

class VerificationJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    document_hash = models.CharField(max_length=64)
    file_path = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    confidence_score = models.FloatField(null=True, blank=True)
    analysis_results = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

# verification/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import VerificationJob
from .ml_models.forgery_detector import ForgeryDetector
from celery import current_app

class DocumentVerificationView(APIView):
    def post(self, request):
        # File upload handling
        uploaded_file = request.FILES.get('document')
        if not uploaded_file:
            return Response({'error': 'No document provided'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create verification job
        job = VerificationJob.objects.create(
            document_hash=self.calculate_hash(uploaded_file),
            file_path=self.save_file(uploaded_file),
            status='pending'
        )
        
        # Queue for processing
        from .tasks import process_document_verification
        process_document_verification.delay(str(job.id))
        
        return Response({
            'verification_id': str(job.id),
            'status': job.status
        })
    
    def get(self, request, verification_id):
        try:
            job = VerificationJob.objects.get(id=verification_id)
            return Response({
                'verification_id': str(job.id),
                'status': job.status,
                'confidence_score': job.confidence_score,
                'analysis_results': job.analysis_results
            })
        except VerificationJob.DoesNotExist:
            return Response({'error': 'Verification job not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
```

#### 3.2.4 ML Models Implementation
```python
# verification/ml_models/forgery_detector.py
import tensorflow as tf
import cv2
import numpy as np
from PIL import Image

class ForgeryDetector:
    def __init__(self):
        self.model = self.load_model()
        
    def load_model(self):
        # Load pre-trained forgery detection model
        return tf.keras.models.load_model('models/forgery_detection_model.h5')
    
    def preprocess_image(self, image_path):
        # Load and preprocess image
        image = cv2.imread(image_path)
        image = cv2.resize(image, (224, 224))
        image = image / 255.0
        return np.expand_dims(image, axis=0)
    
    def detect_forgery(self, image_path):
        processed_image = self.preprocess_image(image_path)
        prediction = self.model.predict(processed_image)
        
        confidence = float(prediction[0][0])
        is_authentic = confidence > 0.5
        
        return {
            'is_authentic': is_authentic,
            'confidence_score': confidence,
            'analysis_details': self.get_detailed_analysis(image_path)
        }
    
    def get_detailed_analysis(self, image_path):
        # Implement detailed analysis
        return {
            'font_consistency': self.check_font_consistency(image_path),
            'pixel_analysis': self.analyze_pixels(image_path),
            'compression_artifacts': self.detect_compression_artifacts(image_path)
        }
```

#### 3.2.5 Celery Tasks
```python
# verification/tasks.py
from celery import shared_task
from .models import VerificationJob
from .ml_models.forgery_detector import ForgeryDetector
from django.utils import timezone

@shared_task
def process_document_verification(job_id):
    try:
        job = VerificationJob.objects.get(id=job_id)
        job.status = 'processing'
        job.save()
        
        detector = ForgeryDetector()
        results = detector.detect_forgery(job.file_path)
        
        job.confidence_score = results['confidence_score']
        job.analysis_results = results
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()
        
    except Exception as e:
        job.status = 'failed'
        job.analysis_results = {'error': str(e)}
        job.save()
```

### 3.3 Blockchain Registry Service

#### 3.3.1 Smart Contract (Solidity)
```solidity
// contracts/DocumentRegistry.sol
pragma solidity ^0.8.0;

contract DocumentRegistry {
    struct Document {
        bytes32 documentHash;
        string ipfsHash;
        address issuer;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(bytes32 => Document) public documents;
    mapping(address => bool) public authorizedIssuers;
    
    event DocumentRegistered(bytes32 indexed documentHash, address indexed issuer);
    event DocumentRevoked(bytes32 indexed documentHash, address indexed issuer);
    
    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }
    
    function registerDocument(
        bytes32 _documentHash,
        string memory _ipfsHash
    ) public onlyAuthorized {
        require(documents[_documentHash].timestamp == 0, "Document already registered");
        
        documents[_documentHash] = Document({
            documentHash: _documentHash,
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });
        
        emit DocumentRegistered(_documentHash, msg.sender);
    }
    
    function verifyDocument(bytes32 _documentHash) 
        public view returns (bool exists, bool isActive, address issuer, uint256 timestamp) {
        Document memory doc = documents[_documentHash];
        return (doc.timestamp != 0, doc.isActive, doc.issuer, doc.timestamp);
    }
    
    function revokeDocument(bytes32 _documentHash) public {
        Document storage doc = documents[_documentHash];
        require(doc.issuer == msg.sender, "Only issuer can revoke");
        require(doc.isActive, "Document already revoked");
        
        doc.isActive = false;
        emit DocumentRevoked(_documentHash, msg.sender);
    }
}
```

#### 3.3.2 Blockchain Service Implementation
```javascript
// blockchain-service/src/services/blockchainService.js
const { ethers } = require('ethers');
const contractABI = require('../contracts/DocumentRegistry.json');

class BlockchainService {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS,
            contractABI.abi,
            this.wallet
        );
    }
    
    async registerDocument(documentHash, ipfsHash) {
        try {
            const tx = await this.contract.registerDocument(documentHash, ipfsHash);
            const receipt = await tx.wait();
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyDocument(documentHash) {
        try {
            const result = await this.contract.verifyDocument(documentHash);
            
            return {
                exists: result.exists,
                isActive: result.isActive,
                issuer: result.issuer,
                timestamp: result.timestamp.toNumber()
            };
        } catch (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }
    }
    
    async getTransactionStatus(txHash) {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        return receipt ? receipt.status === 1 : false;
    }
}

module.exports = BlockchainService;
```

#### 3.3.3 IPFS Integration
```javascript
// blockchain-service/src/services/ipfsService.js
const { create } = require('ipfs-http-client');
const fs = require('fs');

class IPFSService {
    constructor() {
        this.client = create({
            host: process.env.IPFS_HOST || 'localhost',
            port: process.env.IPFS_PORT || 5001,
            protocol: process.env.IPFS_PROTOCOL || 'http'
        });
    }
    
    async uploadDocument(filePath) {
        try {
            const file = fs.readFileSync(filePath);
            const result = await this.client.add(file);
            
            return {
                success: true,
                hash: result.path,
                size: result.size
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async retrieveDocument(hash) {
        try {
            const chunks = [];
            for await (const chunk of this.client.cat(hash)) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (error) {
            throw new Error(`Failed to retrieve document: ${error.message}`);
        }
    }
}

module.exports = IPFSService;
```

### 3.4 Frontend Angular Application

#### 3.4.1 Project Structure
```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── verification.service.ts
│   │   │   └── blockchain.service.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   └── interceptors/
│   │       └── auth.interceptor.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── file-upload/
│   │   │   └── verification-result/
│   │   └── models/
│   │       ├── verification.model.ts
│   │       └── user.model.ts
│   ├── features/
│   │   ├── dashboard/
│   │   ├── verification/
│   │   ├── registry/
│   │   └── analytics/
│   └── app.module.ts
```

#### 3.4.2 Core Services
```typescript
// src/app/core/services/verification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VerificationResult, VerificationJob } from '../../shared/models/verification.model';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  verifyDocument(file: File): Observable<VerificationJob> {
    const formData = new FormData();
    formData.append('document', file);
    
    return this.http.post<VerificationJob>(`${this.apiUrl}/verify/document`, formData);
  }

  getVerificationStatus(verificationId: string): Observable<VerificationResult> {
    return this.http.get<VerificationResult>(`${this.apiUrl}/verify/status/${verificationId}`);
  }

  getVerificationHistory(): Observable<VerificationResult[]> {
    return this.http.get<VerificationResult[]>(`${this.apiUrl}/verify/history`);
  }
}

// src/app/core/services/blockchain.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegistrationResult, LookupResult } from '../../shared/models/blockchain.model';

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private apiUrl = 'http://localhost:3000/api/v1/registry';

  constructor(private http: HttpClient) {}

  registerDocument(file: File, metadata: any): Observable<RegistrationResult> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    return this.http.post<RegistrationResult>(`${this.apiUrl}/register`, formData);
  }

  lookupDocument(documentId: string): Observable<LookupResult> {
    return this.http.get<LookupResult>(`${this.apiUrl}/lookup/${documentId}`);
  }

  verifyHash(hash: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify/${hash}`);
  }
}
```

#### 3.4.3 Document Verification Component
```typescript
// src/app/features/verification/verification.component.ts
import { Component, OnInit } from '@angular/core';
import { VerificationService } from '../../core/services/verification.service';
import { VerificationResult } from '../../shared/models/verification.model';

@Component({
  selector: 'app-verification',
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.scss']
})
export class VerificationComponent implements OnInit {
  selectedFile: File | null = null;
  verificationResult: VerificationResult | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private verificationService: VerificationService) {}

  ngOnInit(): void {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.error = null;
    }
  }

  verifyDocument(): void {
    if (!this.selectedFile) {
      this.error = 'Please select a document to verify';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.verificationService.verifyDocument(this.selectedFile).subscribe({
      next: (job) => {
        this.pollVerificationStatus(job.verification_id);
      },
      error: (error) => {
        this.isLoading = false;
        this.error = 'Failed to start verification process';
        console.error('Verification error:', error);
      }
    });
  }

  private pollVerificationStatus(verificationId: string): void {
    const interval = setInterval(() => {
      this.verificationService.getVerificationStatus(verificationId).subscribe({
        next: (result) => {
          if (result.status === 'completed') {
            this.verificationResult = result;
            this.isLoading = false;
            clearInterval(interval);
          } else if (result.status === 'failed') {
            this.error = 'Verification failed';
            this.isLoading = false;
            clearInterval(interval);
          }
        },
        error: (error) => {
          this.error = 'Failed to get verification status';
          this.isLoading = false;
          clearInterval(interval);
        }
      });
    }, 2000);
  }
}
```

#### 3.4.4 Verification Component Template
```html
<!-- src/app/features/verification/verification.component.html -->
<div class="verification-container">
  <mat-card class="upload-card">
    <mat-card-header>
      <mat-card-title>Document Verification</mat-card-title>
      <mat-card-subtitle>Upload a document to verify its authenticity</mat-card-subtitle>
    </mat-card-header>
    
    <mat-card-content>
      <div class="file-upload-section">
        <input 
          type="file" 
          (change)="onFileSelected($event)"
          accept=".pdf,.jpg,.jpeg,.png"
          #fileInput
          style="display: none;">
        
        <button 
          mat-raised-button 
          color="primary" 
          (click)="fileInput.click()"
          [disabled]="isLoading">
          <mat-icon>upload_file</mat-icon>
          Choose Document
        </button>
        
        <div class="selected-file" *ngIf="selectedFile">
          <mat-icon>description</mat-icon>
          <span>{{ selectedFile.name }}</span>
        </div>
      </div>

      <div class="actions" *ngIf="selectedFile">
        <button 
          mat-raised-button 
          color="accent" 
          (click)="verifyDocument()"
          [disabled]="isLoading">
          <mat-icon>verified</mat-icon>
          Verify Document
        </button>
      </div>

      <div class="loading" *ngIf="isLoading">
        <mat-spinner></mat-spinner>
        <p>Analyzing document...</p>
      </div>

      <div class="error" *ngIf="error">
        <mat-error>{{ error }}</mat-error>
      </div>
    </mat-card-content>
  </mat-card>

  <app-verification-result 
    *ngIf="verificationResult"
    [result]="verificationResult">
  </app-verification-result>
</div>
```

## 4. Database Schema

### 4.1 PostgreSQL Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    organization VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification jobs table
CREATE TABLE verification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    document_hash VARCHAR(64) NOT NULL,
    file_path VARCHAR(500),
    original_filename VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending',
    verification_type VARCHAR(20) DEFAULT 'ai_analysis',
    confidence_score FLOAT,
    analysis_results JSONB,
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Blockchain registry table
CREATE TABLE blockchain_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_hash VARCHAR(64) UNIQUE NOT NULL,
    ipfs_hash VARCHAR(100),
    blockchain_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    issuer_address VARCHAR(42),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_verification_jobs_user_id ON verification_jobs(user_id);
CREATE INDEX idx_verification_jobs_status ON verification_jobs(status);
CREATE INDEX idx_verification_jobs_created_at ON verification_jobs(created_at);
CREATE INDEX idx_blockchain_registry_document_hash ON blockchain_registry(document_hash);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
```

## 5. API Documentation

### 5.1 Authentication Endpoints

#### POST /api/v1/auth/login
```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "organization": "ACME Corp"
  }
}
```

#### POST /api/v1/auth/register
```json
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "organization": "ACME Corp"
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### 5.2 Document Verification Endpoints

#### POST /api/v1/verify/document
```json
// Request (multipart/form-data)
Content-Type: multipart/form-data
document: [FILE]
options: {
  "priority": "high",
  "detailed_analysis": true
}

// Response
{
  "verification_id": "uuid",
  "status": "pending",
  "estimated_completion": "2024-01-01T12:00:00Z"
}
```

#### GET /api/v1/verify/status/{verificationId}
```json
// Response
{
  "verification_id": "uuid",
  "status": "completed",
  "confidence_score": 0.92,
  "is_authentic": true,
  "analysis_results": {
    "font_consistency": {
      "score": 0.95,
      "details": "Font consistency maintained throughout document"
    },
    "pixel_analysis": {
      "score": 0.88,
      "anomalies_detected": []
    },
    "compression_artifacts": {
      "score": 0.94,
      "suspicious_regions": []
    }
  },
  "blockchain_verified": false,
  "processing_time_ms": 3500,
  "completed_at": "2024-01-01T12:00:30Z"
}
```

### 5.3 Blockchain Registry Endpoints

#### POST /api/v1/registry/register
```json
// Request (multipart/form-data)
Content-Type: multipart/form-data
document: [FILE]
metadata: {
  "document_type": "certificate",
  "issuer": "University of Example",
  "issued_date": "2024-01-01"
}

// Response
{
  "success": true,
  "document_hash": "0x1234567890abcdef...",
  "ipfs_hash": "QmXyZ123...",
  "transaction_hash": "0xabcdef1234567890...",
  "estimated_confirmation_time": 30
}
```

#### GET /api/v1/registry/lookup/{documentId}
```json
// Response
{
  "found": true,
  "document_hash": "0x1234567890abcdef...",
  "ipfs_hash": "QmXyZ123..