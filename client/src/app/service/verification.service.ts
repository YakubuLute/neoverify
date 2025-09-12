// // src/app/core/services/verification.service.ts
// import { Injectable } from '@angular/core'
// import { HttpClient } from '@angular/common/http'
// import { Observable } from 'rxjs'
// import {
//   VerificationResult,
//   VerificationJob
// } from '../../shared/models/verification.model'

// @Injectable({
//   providedIn: 'root'
// })
// export class VerificationService {
//   private apiUrl = 'http://localhost:3000/api/v1'

//   constructor (private http: HttpClient) {}

//   verifyDocument (file: File): Observable<VerificationJob> {
//     const formData = new FormData()
//     formData.append('document', file)

//     return this.http.post<VerificationJob>(
//       `${this.apiUrl}/verify/document`,
//       formData
//     )
//   }

//   getVerificationStatus (
//     verificationId: string
//   ): Observable<VerificationResult> {
//     return this.http.get<VerificationResult>(
//       `${this.apiUrl}/verify/status/${verificationId}`
//     )
//   }

//   getVerificationHistory (): Observable<VerificationResult[]> {
//     return this.http.get<VerificationResult[]>(`${this.apiUrl}/verify/history`)
//   }
// }
