import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { ToastModule } from 'primeng/toast';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);

  showHeader = true;

  constructor() {
    // Hide header on certain routes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const hideHeaderRoutes = ['/auth/login', '/auth/signup', '/auth/mfa', '/'];
        this.showHeader = !hideHeaderRoutes.some(route => event.url.startsWith(route));
      });
  }
}
