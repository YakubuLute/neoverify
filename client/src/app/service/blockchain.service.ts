// // src/app/core/services/blockchain.service.ts
// import { Injectable } from '@angular/core'
// import { HttpClient } from '@angular/common/http'
// import { Observable } from 'rxjs'
// import {
//   RegistrationResult,
//   LookupResult
// } from '../../shared/models/blockchain.model'

// @Injectable({
//   providedIn: 'root'
// })
// export class BlockchainService {
//   private apiUrl = 'http://localhost:3000/api/v1/registry'

//   constructor (private http: HttpClient) {}

//   registerDocument (file: File, metadata: any): Observable<RegistrationResult> {
//     const formData = new FormData()
//     formData.append('document', file)
//     formData.append('metadata', JSON.stringify(metadata))

//     return this.http.post<RegistrationResult>(
//       `${this.apiUrl}/register`,
//       formData
//     )
//   }

//   lookupDocument (documentId: string): Observable<LookupResult> {
//     return this.http.get<LookupResult>(`${this.apiUrl}/lookup/${documentId}`)
//   }

//   verifyHash (hash: string): Observable<any> {
//     return this.http.get(`${this.apiUrl}/verify/${hash}`)
//   }
// }
