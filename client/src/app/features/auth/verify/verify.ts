import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SHARED_IMPORTS } from '../../../shared';

@Component({
  selector: 'app-document-verify',
  standalone: true,
  imports: [ButtonModule, SHARED_IMPORTS],
  templateUrl: './verify.html',
  styleUrl: './verify.scss'
})
export class Verify {

}
