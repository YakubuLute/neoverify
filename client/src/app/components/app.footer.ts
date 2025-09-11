import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="footer-container">
      <div class="footer-copyright">202X PrimeNG.</div>
      <div class="footer-links">
        <a
          href="https://twitter.com/prime_ng"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          <i class="pi pi-twitter footer-icon"></i>
        </a>
        <a
          href="https://primeng.org"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          <i class="pi pi-globe footer-icon"></i>
        </a>
        <a
          href="https://github.com/primefaces/primeng"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          <i class="pi pi-github footer-icon"></i>
        </a>
      </div>
    </div>
  `,
  host: {
    class: 'footer',
  },
})
export class AppFooter {}
