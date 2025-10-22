import { Component, signal } from '@angular/core';
import { SharedModule } from '../../shared';

@Component({
  selector: 'app-dashboard',
  imports: [SharedModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  protected readonly stats = signal([
    { label: 'Total Users', value: '1,234', icon: 'pi-users', color: 'text-blue-600' },
    { label: 'Active Sessions', value: '89', icon: 'pi-chart-line', color: 'text-green-600' },
    { label: 'Revenue', value: '$12,345', icon: 'pi-dollar', color: 'text-purple-600' },
    { label: 'Growth', value: '+23%', icon: 'pi-arrow-up', color: 'text-orange-600' }
  ]);
}
