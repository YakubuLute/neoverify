// // src/app/features/verification/verification.component.ts
// import { Component, OnInit } from '@angular/core'
// import { VerificationService } from '../../core/services/verification.service'
// import { VerificationResult } from '../../shared/models/verification.model'

// @Component({
//   selector: 'app-verification',
//   templateUrl: './verification.component.html',
//   styleUrls: ['./verification.component.scss']
// })
// export class VerificationComponent implements OnInit {
//   selectedFile: File | null = null
//   verificationResult: VerificationResult | null = null
//   isLoading = false
//   error: string | null = null

//   constructor (private verificationService: VerificationService) {}

//   ngOnInit (): void {}

//   onFileSelected (event: any): void {
//     const file = event.target.files[0]
//     if (file) {
//       this.selectedFile = file
//       this.error = null
//     }
//   }

//   verifyDocument (): void {
//     if (!this.selectedFile) {
//       this.error = 'Please select a document to verify'
//       return
//     }

//     this.isLoading = true
//     this.error = null

//     this.verificationService.verifyDocument(this.selectedFile).subscribe({
//       next: job => {
//         this.pollVerificationStatus(job.verification_id)
//       },
//       error: error => {
//         this.isLoading = false
//         this.error = 'Failed to start verification process'
//         console.error('Verification error:', error)
//       }
//     })
//   }

//   private pollVerificationStatus (verificationId: string): void {
//     const interval = setInterval(() => {
//       this.verificationService.getVerificationStatus(verificationId).subscribe({
//         next: result => {
//           if (result.status === 'completed') {
//             this.verificationResult = result
//             this.isLoading = false
//             clearInterval(interval)
//           } else if (result.status === 'failed') {
//             this.error = 'Verification failed'
//             this.isLoading = false
//             clearInterval(interval)
//           }
//         },
//         error: error => {
//           this.error = 'Failed to get verification status'
//           this.isLoading = false
//           clearInterval(interval)
//         }
//       })
//     }, 2000)
//   }
// }
