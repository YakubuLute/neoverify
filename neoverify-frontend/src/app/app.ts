import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, CardModule, ToolbarModule],
  templateUrl: './app.html',
  template:`<h1>Hello woorld</h1>`,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('NeoVerify Frontend');
}
