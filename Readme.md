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
  "ipfs_hash": "QmXyZ123...",
  "issuer_address": "0x742d35Cc6635C0532925a3b8D4b...",
  "registered_at": "2024-01-01T10:00:00Z",
  "block_number": 12345678,
  "is_active": true,
  "metadata": {
    "document_type": "certificate",
    "issuer": "University of Example"
  }
}
```

#### GET /api/v1/registry/verify/{hash}
```json
// Response
{
  "verified": true,
  "exists_on_blockchain": true,
  "is_active": true,
  "issuer_address": "0x742d35Cc6635C0532925a3b8D4b...",
  "registration_timestamp": 1704110400,
  "block_confirmations": 156
}
```

## 6. Security Specifications

### 6.1 Authentication & Authorization
- **JWT Token-based Authentication**: 24-hour expiration with refresh token mechanism
- **API Key Authentication**: For service-to-service integrations
- **Role-based Access Control (RBAC)**: Admin, Organization Admin, User roles
- **Rate Limiting**: Tiered limits based on subscription level
- **IP Whitelisting**: Optional for enterprise clients

### 6.2 Data Security
```javascript
// Security middleware implementation
const securityMiddleware = {
  // Input validation
  validateInput: (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  },

  // File upload security
  fileUploadSecurity: multer({
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 1
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  }),

  // Document sanitization
  sanitizeDocument: async (filePath) => {
    // Remove EXIF data from images
    // Scan for malicious content
    // Validate file structure
    return sanitizedPath;
  }
};
```

### 6.3 Blockchain Security
- **Private Key Management**: HSM (Hardware Security Module) or secure key vault
- **Smart Contract Auditing**: Multi-signature wallet for contract upgrades
- **Gas Price Optimization**: Dynamic gas price calculation
- **Transaction Monitoring**: Automated alerts for failed transactions

### 6.4 Data Privacy & GDPR Compliance
```javascript
// Privacy compliance utilities
const privacyUtils = {
  // Data anonymization
  anonymizeUserData: (userData) => {
    return {
      ...userData,
      email: hashEmail(userData.email),
      name: null,
      ipAddress: null
    };
  },

  // Right to erasure (GDPR Article 17)
  deleteUserData: async (userId) => {
    await Promise.all([
      User.destroy({ where: { id: userId } }),
      VerificationJob.update(
        { user_id: null }, 
        { where: { user_id: userId } }
      ),
      ApiUsage.destroy({ where: { user_id: userId } })
    ]);
  },

  // Data portability (GDPR Article 20)
  exportUserData: async (userId) => {
    const [user, jobs, usage] = await Promise.all([
      User.findByPk(userId),
      VerificationJob.findAll({ where: { user_id: userId } }),
      ApiUsage.findAll({ where: { user_id: userId } })
    ]);
    
    return { user, verificationHistory: jobs, apiUsage: usage };
  }
};
```

## 7. Performance & Scalability

### 7.1 Caching Strategy
```javascript
// Redis caching implementation
const cacheService = {
  // Verification result caching
  cacheVerificationResult: async (verificationId, result, ttl = 3600) => {
    await redisClient.setex(
      `verification:${verificationId}`, 
      ttl, 
      JSON.stringify(result)
    );
  },

  // Blockchain lookup caching
  cacheBlockchainLookup: async (documentHash, result, ttl = 300) => {
    await redisClient.setex(
      `blockchain:${documentHash}`, 
      ttl, 
      JSON.stringify(result)
    );
  },

  // User session caching
  cacheUserSession: async (token, userData, ttl = 86400) => {
    await redisClient.setex(
      `session:${token}`, 
      ttl, 
      JSON.stringify(userData)
    );
  }
};
```

### 7.2 Database Optimization
```sql
-- Database optimization strategies

-- Partitioning for large tables
CREATE TABLE verification_jobs_2024 PARTITION OF verification_jobs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Materialized views for analytics
CREATE MATERIALIZED VIEW verification_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_verifications,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN confidence_score > 0.8 THEN 1 END) as high_confidence_count
FROM verification_jobs
WHERE status = 'completed'
GROUP BY DATE_TRUNC('day', created_at);

-- Refresh schedule
CREATE OR REPLACE FUNCTION refresh_verification_stats()
RETURNS void AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY verification_stats;
END;
$ LANGUAGE plpgsql;
```

### 7.3 Load Balancing & Scaling
```yaml
# Docker Compose for horizontal scaling
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-gateway

  api-gateway:
    build: ./api-gateway
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres

  ai-forensics:
    build: ./ai-forensics
    deploy:
      replicas: 2
    environment:
      - CELERY_BROKER_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_forensics
    volumes:
      - ./ml_models:/app/models
    depends_on:
      - redis
      - postgres

  blockchain-service:
    build: ./blockchain-service
    deploy:
      replicas: 2
    environment:
      - RPC_URL=${ETHEREUM_RPC_URL}
      - CONTRACT_ADDRESS=${CONTRACT_ADDRESS}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=document_verification
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  redis_data:
  postgres_data:
```

### 7.4 ML Model Performance Optimization
```python
# AI model optimization strategies
class OptimizedForgeryDetector:
    def __init__(self):
        # Load TensorFlow Lite model for faster inference
        self.interpreter = tf.lite.Interpreter(
            model_path='models/forgery_detection_optimized.tflite'
        )
        self.interpreter.allocate_tensors()
        
        # Pre-allocate input/output tensors
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        
        # Initialize image preprocessing pipeline
        self.preprocess_pipeline = self._build_preprocessing_pipeline()
    
    def _build_preprocessing_pipeline(self):
        return tf.keras.Sequential([
            tf.keras.layers.Resizing(224, 224),
            tf.keras.layers.Rescaling(1./255),
            tf.keras.layers.Normalization(mean=[0.485, 0.456, 0.406], 
                                        variance=[0.229, 0.224, 0.225])
        ])
    
    @tf.function
    def preprocess_batch(self, images):
        return self.preprocess_pipeline(images)
    
    def predict_batch(self, image_batch):
        # Batch processing for better throughput
        processed_batch = self.preprocess_batch(image_batch)
        
        self.interpreter.set_tensor(
            self.input_details[0]['index'], 
            processed_batch.numpy()
        )
        self.interpreter.invoke()
        
        predictions = self.interpreter.get_tensor(
            self.output_details[0]['index']
        )
        
        return predictions
```

## 8. Monitoring & Logging

### 8.1 Application Monitoring
```javascript
// Prometheus metrics collection
const promClient = require('prom-client');

// Custom metrics
const verificationCounter = new promClient.Counter({
  name: 'document_verifications_total',
  help: 'Total number of document verifications',
  labelNames: ['status', 'type']
});

const verificationDuration = new promClient.Histogram({
  name: 'document_verification_duration_seconds',
  help: 'Duration of document verification process',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const blockchainTransactionGauge = new promClient.Gauge({
  name: 'blockchain_transactions_pending',
  help: 'Number of pending blockchain transactions'
});

// Middleware to track metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    if (req.path.includes('/verify')) {
      verificationCounter.inc({ 
        status: res.statusCode >= 400 ? 'error' : 'success',
        type: 'ai_analysis'
      });
      verificationDuration.observe({ type: 'ai_analysis' }, duration);
    }
  });
  
  next();
};
```

### 8.2 Centralized Logging
```javascript
// Winston logger configuration
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'api-gateway',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Console logging for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File logging
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    
    // Elasticsearch for production
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: process.env.ELASTICSEARCH_URL },
      index: 'document-verification-logs'
    })
  ]
});

// Structured logging helpers
const loggers = {
  verification: {
    started: (jobId, userId, filename) => {
      logger.info('Document verification started', {
        jobId,
        userId,
        filename,
        event: 'verification_started'
      });
    },
    
    completed: (jobId, duration, confidence, isAuthentic) => {
      logger.info('Document verification completed', {
        jobId,
        duration,
        confidence,
        isAuthentic,
        event: 'verification_completed'
      });
    },
    
    failed: (jobId, error) => {
      logger.error('Document verification failed', {
        jobId,
        error: error.message,
        stack: error.stack,
        event: 'verification_failed'
      });
    }
  },
  
  blockchain: {
    registration: (documentHash, txHash, gasUsed) => {
      logger.info('Document registered on blockchain', {
        documentHash,
        transactionHash: txHash,
        gasUsed,
        event: 'blockchain_registration'
      });
    }
  }
};
```

### 8.3 Health Check Endpoints
```javascript
// Health check implementation
const healthChecks = {
  // Database connectivity
  checkDatabase: async () => {
    try {
      await db.raw('SELECT 1');
      return { status: 'healthy', latency: 0 };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },

  // Redis connectivity
  checkRedis: async () => {
    try {
      const start = Date.now();
      await redisClient.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },

  // AI service availability
  checkAIService: async () => {
    try {
      const response = await axios.get('http://ai-service:8000/health', {
        timeout: 5000
      });
      return { status: 'healthy', response: response.status };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },

  // Blockchain node connectivity
  checkBlockchain: async () => {
    try {
      const blockNumber = await ethersProvider.getBlockNumber();
      return { status: 'healthy', currentBlock: blockNumber };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    healthChecks.checkDatabase(),
    healthChecks.checkRedis(),
    healthChecks.checkAIService(),
    healthChecks.checkBlockchain()
  ]);

  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: checks[0].value,
      redis: checks[1].value,
      aiService: checks[2].value,
      blockchain: checks[3].value
    }
  };

  // Determine overall health
  const hasUnhealthy = Object.values(results.services)
    .some(service => service.status === 'unhealthy');
  
  if (hasUnhealthy) {
    results.status = 'degraded';
    return res.status(503).json(results);
  }

  res.json(results);
});
```

## 9. Deployment & DevOps

### 9.1 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Document Verification Platform

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api-gateway, ai-forensics, blockchain-service, frontend]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      if: matrix.service != 'ai-forensics'
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: ${{ matrix.service }}/package-lock.json
    
    - name: Setup Python
      if: matrix.service == 'ai-forensics'
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        cd ${{ matrix.service }}
        if [ -f "requirements.txt" ]; then
          pip install -r requirements.txt
        else
          npm ci
        fi
    
    - name: Run tests
      run: |
        cd ${{ matrix.service }}
        if [ -f "manage.py" ]; then
          python manage.py test
        else
          npm test
        fi
    
    - name: Run linting
      run: |
        cd ${{ matrix.service }}
        if [ -f "requirements.txt" ]; then
          flake8 .
        else
          npm run lint
        fi

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    
    - name: Login to Amazon ECR
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker images
      run: |
        services=("api-gateway" "ai-forensics" "blockchain-service")
        for service in "${services[@]}"; do
          docker build -t $ECR_REGISTRY/$service:$GITHUB_SHA ./$service
          docker push $ECR_REGISTRY/$service:$GITHUB_SHA
          docker tag $ECR_REGISTRY/$service:$GITHUB_SHA $ECR_REGISTRY/$service:latest
          docker push $ECR_REGISTRY/$service:latest
        done
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to EKS
      run: |
        aws eks update-kubeconfig --region us-west-2 --name document-verification-cluster
        kubectl set image deployment/api-gateway api-gateway=$ECR_REGISTRY/api-gateway:$GITHUB_SHA
        kubectl set image deployment/ai-forensics ai-forensics=$ECR_REGISTRY/ai-forensics:$GITHUB_SHA
        kubectl set image deployment/blockchain-service blockchain-service=$ECR_REGISTRY/blockchain-service:$GITHUB_SHA
        kubectl rollout status deployment/api-gateway
        kubectl rollout status deployment/ai-forensics
        kubectl rollout status deployment/blockchain-service
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
```

### 9.2 Kubernetes Deployment
```yaml
# k8s/api-gateway-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  labels:
    app: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: your-registry/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer

---
# HorizontalPodAutoscaler for API Gateway
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 9.3 Infrastructure as Code (Terraform)
```hcl
# infrastructure/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "document-verification-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "document-verification-vpc"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "document-verification-private-${count.index + 1}"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 10}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "document-verification-public-${count.index + 1}"
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "document-verification-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.28"
  
  vpc_config {
    subnet_ids         = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_config {
      public_access  = true
      private_access = true
    }
  }
  
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks
  ]
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier = "document-verification-db"
  
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "document_verification"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "document-verification-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = {
    Name = "document-verification-db"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "document-verification-redis"
  description                  = "Redis cluster for document verification"
  
  port                         = 6379
  parameter_group_name         = "default.redis7"
  node_type                    = "cache.t3.micro"
  num_cache_clusters           = 2
  
  subnet_group_name            = aws_elasticache_subnet_group.main.name
  security_group_ids           = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                   = var.redis_auth_token
  
  tags = {
    Name = "document-verification-redis"
  }
}

# S3 Bucket for document storage
resource "aws_s3_bucket" "documents" {
  bucket = "document-verification-storage-${random_string.bucket_suffix.result}"
  
  tags = {
    Name = "document-verification-storage"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "documents" {
  bucket = aws_s3_bucket.documents.id
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}
```

## 10. Testing Strategy

### 10.1 Unit Testing
```javascript
// api-gateway/tests/services/verification.test.js
const request = require('supertest');
const app = require('../../src/app');
const { VerificationJob } = require('../../src/models');

describe('Verification Service', () => {
  beforeEach(async () => {
    await VerificationJob.destroy({ where: {}, truncate: true });
  });

  describe('POST /api/v1/verify/document', () => {
    it('should create a new verification job', async () => {
      const response = await request(app)
        .post('/api/v1/verify/document')
        .attach('document', 'tests/fixtures/sample-document.pdf')
        .set('Authorization', 'Bearer ' + validToken)
        .expect(201);

      expect(response.body).toHaveProperty('verification_id');
      expect(response.body.status).toBe('pending');
    });

    it('should reject invalid file types', async () => {
      await request(app)
        .post('/api/v1/verify/document')
        .attach('document', 'tests/fixtures/malicious.exe')
        .set('Authorization', 'Bearer ' + validToken)
        .expect(400);
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests rapidly
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/v1/verify/document')
          .attach('document', 'tests/fixtures/sample-document.pdf')
          .set('Authorization', 'Bearer ' + validToken)
      );

      const responses = await Promise.all(promises);
      const tooManyRequestsCount = responses.filter(r => r.status === 429).length;
      
      expect(tooManyRequestsCount).toBeGreaterThan(0);
    });
  });
});
```

```python
# ai-forensics/tests/test_forgery_detector.py
import unittest
import numpy as np
from unittest.mock import patch, MagicMock
from verification.ml_models.forgery_detector import ForgeryDetector

class TestForgeryDetector(unittest.TestCase):
    def setUp(self):
        self.detector = ForgeryDetector()
    
    @patch('verification.ml_models.forgery_detector.tf.keras.models.load_model')
    def test_model_loading(self, mock_load_model):
        mock_model = MagicMock()
        mock_load_model.return_value = mock_model
        
        detector = ForgeryDetector()
        mock_load_model.assert_called_once_with('models/forgery_detection_model.h5')
    
    def test_image_preprocessing(self):
        # Test with sample image
        processed = self.detector.preprocess_image('tests/fixtures/sample-image.jpg')
        
        self.assertEqual(processed.shape, (1, 224, 224, 3))
        self.assertTrue(np.all(processed >= 0.0) and np.all(processed <= 1.0))
    
    @patch('verification.ml_models.forgery_detector.cv2.imread')
    def test_forgery_detection(self, mock_imread):
        # Mock image data
        mock_image = np.random.randint(0, 255, (500, 500, 3), dtype=np.uint8)
        mock_imread.return_value = mock_image
        
        # Mock model prediction
        self.detector.model.predict = MagicMock(return_value=np.array([[0.85]]))
        
        result = self.detector.detect_forgery('fake_path.jpg')
        
        self.assertIsInstance(result, dict)
        self.assertIn('is_authentic', result)
        self.assertIn('confidence_score', result)
        self.assertEqual(result['confidence_score'], 0.85)
        self.assertTrue(result['is_authentic'])
    
    def test_detailed_analysis(self):
        with patch.object(self.detector, 'check_font_consistency', return_value=0.9), \
             patch.object(self.detector, 'analyze_pixels', return_value=0.85), \
             patch.object(self.detector, 'detect_compression_artifacts', return_value=0.92):
            
            details = self.detector.get_detailed_analysis('fake_path.jpg')
            
            self.assertEqual(details['font_consistency'], 0.9)
            self.assertEqual(details['pixel_analysis'], 0.85)
            self.assertEqual(details['compression_artifacts'], 0.92)

if __name__ == '__main__':
    unittest.main()
```

### 10.2 Integration Testing
```javascript
// tests/integration/verification-workflow.test.js
const request = require('supertest');
const app = require('../../src/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers/database');

describe('Document Verification Workflow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should complete full verification workflow', async () => {
    // Step 1: Upload document for verification
    const uploadResponse = await request(app)
      .post('/api/v1/verify/document')
      .attach('document', 'tests/fixtures/authentic-certificate.pdf')
      .set('Authorization', 'Bearer ' + testToken)
      .expect(201);

    const verificationId = uploadResponse.body.verification_id;

    // Step 2: Poll for completion
    let attempts = 0;
    let verificationResult;
    
    while (attempts < 30) { // Max 30 seconds
      const statusResponse = await request(app)
        .get(`/api/v1/verify/status/${verificationId}`)
        .set('Authorization', 'Bearer ' + testToken)
        .expect(200);

      if (statusResponse.body.status === 'completed') {
        verificationResult = statusResponse.body;
        break;
      } else if (statusResponse.body.status === 'failed') {
        throw new Error('Verification failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    // Step 3: Verify results
    expect(verificationResult).toBeDefined();
    expect(verificationResult.confidence_score).toBeGreaterThan(0);
    expect(verificationResult.analysis_results).toBeDefined();
    expect(verificationResult.analysis_results.font_consistency).toBeDefined();

    // Step 4: Check verification history
    const historyResponse = await request(app)
      .get('/api/v1/verify/history')
      .set('Authorization', 'Bearer ' + testToken)
      .expect(200);

    expect(historyResponse.body.length).toBe(1);
    expect(historyResponse.body[0].verification_id).toBe(verificationId);
  });

  it('should handle blockchain registry integration', async () => {
    // Step 1: Register document on blockchain
    const registerResponse = await request(app)
      .post('/api/v1/registry/register')
      .attach('document', 'tests/fixtures/official-document.pdf')
      .field('metadata', JSON.stringify({
        document_type: 'certificate',
        issuer: 'Test University'
      }))
      .set('Authorization', 'Bearer ' + adminToken)
      .expect(201);

    const documentHash = registerResponse.body.document_hash;

    // Step 2: Wait for blockchain confirmation
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Lookup document
    const lookupResponse = await request(app)
      .get(`/api/v1/registry/lookup/${documentHash}`)
      .set('Authorization', 'Bearer ' + testToken)
      .expect(200);

    expect(lookupResponse.body.found).toBe(true);
    expect(lookupResponse.body.document_hash).toBe(documentHash);

    // Step 4: Verify via blockchain
    const verifyResponse = await request(app)
      .get(`/api/v1/registry/verify/${documentHash}`)
      .set('Authorization', 'Bearer ' + testToken)
      .expect(200);

    expect(verifyResponse.body.verified).toBe(true);
    expect(verifyResponse.body.exists_on_blockchain).toBe(true);
  });
});
```

### 10.3 End-to-End Testing
```typescript
// e2e/tests/verification-flow.e2e.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Document Verification E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:4200');
    
    // Login
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should verify document successfully', async () => {
    // Navigate to verification page
    await page.click('[data-testid="verify-document-nav"]');
    
    // Upload document
    await page.setInputFiles(
      '[data-testid="file-input"]', 
      'tests/fixtures/sample-certificate.pdf'
    );
    
    // Start verification
    await page.click('[data-testid="verify-button"]');
    
    // Wait for loading to appear
    await expect(page.locator('[data-testid="verification-loading"]')).toBeVisible();
    
    // Wait for results (with timeout)
    await expect(page.locator('[data-testid="verification-result"]')).toBeVisible({
      timeout: 30000
    });
    
    // Check results
    const confidenceScore = await page.textContent('[data-testid="confidence-score"]');
    expect(parseFloat(confidenceScore!)).toBeGreaterThan(0);
    
    const authenticityStatus = await page.textContent('[data-testid="authenticity-status"]');
    expect(authenticityStatus).toBeTruthy();
  });

  test('should handle document registration', async () => {
    await page.click('[data-testid="register-document-nav"]');
    
    // Upload document
    await page.setInputFiles(
      '[data-testid="registry-file-input"]', 
      'tests/fixtures/official-document.pdf'
    );
    
    // Fill metadata
    await page.fill('[data-testid="document-type"]', 'Certificate');
    await page.fill('[data-testid="issuer"]', 'Test Institution');
    
    // Register
    await page.click('[data-testid="register-button"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="registration-success"]')).toBeVisible({
      timeout: 60000
    });
    
    // Verify transaction hash is displayed
    const txHash = await page.textContent('[data-testid="transaction-hash"]');
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  test('should display analytics dashboard', async () => {
    await page.click('[data-testid="analytics-nav"]');
    
    // Check chart elements
    await expect(page.locator('[data-testid="verification-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-distribution"]')).toBeVisible();
    
    // Check statistics
    const totalVerifications = await page.textContent('[data-testid="total-verifications"]');
    expect(totalVerifications).toBeTruthy();
    
    const averageConfidence = await page.textContent('[data-testid="average-confidence"]');
    expect(averageConfidence).toBeTruthy();
  });
});
```

### 10.4 Load Testing
```javascript
// load-tests/verification-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.02'], // Error rate under 2%
  },
};

const BASE_URL = 'http://localhost:3000/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Test token

export default function() {
  // Test document verification endpoint
  const fd = new FormData();
  fd.append('document', http.file('sample-document.pdf', 'application/pdf'));
  
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
  };
  
  const response = http.post(`${BASE_URL}/verify/document`, fd.body(), {
    headers: Object.assign(headers, { 'Content-Type': fd.contentType }),
  });
  
  check(response, {
    'verification request successful': (r) => r.status === 201,
    'response has verification_id': (r) => r.json('verification_id') !== undefined,
  });
  
  if (response.status === 201) {
    const verificationId = response.json('verification_id');
    
    // Poll for verification status
    let attempts = 0;
    while (attempts < 10) {
      sleep(1);
      
      const statusResponse = http.get(
        `${BASE_URL}/verify/status/${verificationId}`,
        { headers }
      );
      
      check(statusResponse, {
        'status check successful': (r) => r.status === 200,
      });
      
      const status = statusResponse.json('status');
      if (status === 'completed' || status === 'failed') {
        break;
      }
      
      attempts++;
    }
  }
  
  sleep(1);
}
```

## 11. Error Handling & Recovery

### 11.1 Global Error Handler
```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  logger.error('ERROR 💥', err);
  
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = Object.assign(err);
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
```

### 11.2 Retry Mechanisms
```javascript
// utils/retryHelper.js
const logger = require('./logger');

class RetryHelper {
  static async executeWithRetry(
    operation,
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000
  ) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          logger.error(`Operation failed after ${maxRetries} attempts:`, error);
          break;
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.1),
          maxDelay
        );
        
        logger.warn(`Operation failed on attempt ${attempt}, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  static async retryBlockchainTransaction(transactionFn, options = {}) {
    const {
      maxRetries = 5,
      baseDelay = 2000,
      gasMultiplier = 1.1
    } = options;
    
    let gasPrice = await this.getCurrentGasPrice();
    
    return this.executeWithRetry(
      async () => {
        try {
          return await transactionFn(gasPrice);
        } catch (error) {
          if (error.message.includes('transaction underpriced')) {
            gasPrice = Math.floor(gasPrice * gasMultiplier);
            logger.info(`Increasing gas price to ${gasPrice}`);
            throw error; // Retry with higher gas price
          }
          throw error;
        }
      },
      maxRetries,
      baseDelay
    );
  }
  
  static async getCurrentGasPrice() {
    // Implementation to get current gas price
    return 20000000000; // 20 gwei default
  }
}

// Usage in blockchain service
const blockchainService = {
  async registerDocument(documentHash, ipfsHash) {
    return RetryHelper.retryBlockchainTransaction(
      async (gasPrice) => {
        const tx = await this.contract.registerDocument(documentHash, ipfsHash, {
          gasPrice
        });
        return tx.wait();
      }
    );
  }
};
```

### 11.3 Circuit Breaker Pattern
```javascript
// utils/circuitBreaker.js
class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    
    this.metrics = {
      requests: 0,
      failures: 0,
      successes: 0,
      timeouts: 0
    };
  }
  
  async call(...args) {
    this.metrics.requests++;
    
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      // Transition to HALF_OPEN
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await this.service(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.metrics.successes++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit breaker transitioned to CLOSED');
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.metrics.failures++;
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      logger.warn(`Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      metrics: this.metrics
    };
  }
}

// Usage with external services
const aiServiceBreaker = new CircuitBreaker(
  async (documentPath) => {
    const response = await axios.post('http://ai-service:8000/analyze', {
      document_path: documentPath
    }, { timeout: 30000 });
    return response.data;
  },
  { failureThreshold: 3, recoveryTimeout: 30000 }
);

const blockchainServiceBreaker = new CircuitBreaker(
  async (hash) => {
    return await blockchain.verifyDocument(hash);
  },
  { failureThreshold: 5, recoveryTimeout: 60000 }
);
```

## 12. Security Considerations

### 12.1 Input Validation & Sanitization
```javascript
// validators/documentValidator.js
const Joi = require('joi');
const sharp = require('sharp');
const pdf = require('pdf-parse');

class DocumentValidator {
  static validateFileUpload = Joi.object({
    mimetype: Joi.string().valid(
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ).required(),
    size: Joi.number().max(50 * 1024 * 1024).required(), // 50MB max
    filename: Joi.string().pattern(/^[a-zA-Z0-9._-]+$/).max(255).required()
  });

  static async validatePDF(buffer) {
    try {
      const data = await pdf(buffer);
      
      // Check for suspicious JavaScript or forms
      if (data.text.includes('<script>') || 
          data.text.includes('this.print()') ||
          data.text.includes('/JS') ||
          data.text.includes('/JavaScript')) {
        throw new Error('PDF contains potentially malicious content');
      }
      
      // Check for embedded files
      if (buffer.includes(Buffer.from('/EmbeddedFile'))) {
        throw new Error('PDF contains embedded files');
      }
      
      return true;
    } catch (error) {
      throw new Error(`PDF validation failed: ${error.message}`);
    }
  }
  
  static async validateImage(buffer, mimetype) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Check image dimensions
      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error('Image dimensions too large');
      }
      
      // Verify actual format matches declared mimetype
      const expectedFormat = mimetype.split('/')[1];
      if (metadata.format !== expectedFormat && 
          !(expectedFormat === 'jpeg' && metadata.format === 'jpg')) {
        throw new Error('Image format mismatch');
      }
      
      // Check for EXIF data and remove it
      const cleanBuffer = await sharp(buffer)
        .jpeg({ quality: 95 })
        .withMetadata(false)
        .toBuffer();
      
      return cleanBuffer;
    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }
  
  static async sanitizeDocument(file) {
    // Validate file metadata
    const { error } = this.validateFileUpload.validate({
      mimetype: file.mimetype,
      size: file.size,
      filename: file.originalname
    });
    
    if (error) {
      throw new Error(`Invalid file: ${error.details[0].message}`);
    }
    
    // Type-specific validation
    if (file.mimetype === 'application/pdf') {
      await this.validatePDF(file.buffer);
      return file.buffer;
    } else if (file.mimetype.startsWith('image/')) {
      return await this.validateImage(file.buffer, file.mimetype);
    }
    
    throw new Error('Unsupported file type');
  }
}

module.exports = DocumentValidator;
```

### 12.2 API Security Middleware
```javascript
// middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Rate limiting configurations
const rateLimiters = {
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  
  verification: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit verification requests
    message: {
      error: 'Too many verification requests, please wait before trying again.'
    }
  }),
  
  auth: rateLimit({
    windowMs: 15 * 60 * 1})
}