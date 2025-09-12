// src/app/core/services/verification.service.ts
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import {
  VerificationResult,
  VerificationJob
} from '../../shared/models/verification.model'

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private apiUrl = 'http://localhost:3000/api/v1'

  constructor (private http: HttpClient) {}

  verifyDocument (file: File): Observable<VerificationJob> {
    const formData = new FormData()
    formData.append('document', file)

    return this.http.post<VerificationJob>(
      `${this.apiUrl}/verify/document`,
      formData
    )
  }

  getVerificationStatus (
    verificationId: string
  ): Observable<VerificationResult> {
    return this.http.get<VerificationResult>(
      `${this.apiUrl}/verify/status/${verificationId}`
    )
  }

  getVerificationHistory (): Observable<VerificationResult[]> {
    return this.http.get<VerificationResult[]>(`${this.apiUrl}/verify/history`)
  }
}

// src/app/core/services/blockchain.service.ts
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import {
  RegistrationResult,
  LookupResult
} from '../../shared/models/blockchain.model'

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private apiUrl = 'http://localhost:3000/api/v1/registry'

  constructor (private http: HttpClient) {}

  registerDocument (file: File, metadata: any): Observable<RegistrationResult> {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('metadata', JSON.stringify(metadata))

    return this.http.post<RegistrationResult>(
      `${this.apiUrl}/register`,
      formData
    )
  }

  lookupDocument (documentId: string): Observable<LookupResult> {
    return this.http.get<LookupResult>(`${this.apiUrl}/lookup/${documentId}`)
  }

  verifyHash (hash: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify/${hash}`)
  }
}
