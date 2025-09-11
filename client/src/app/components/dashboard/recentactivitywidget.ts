import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'recent-activity-widget',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <span class="chart-title">Recent Activity</span>
    <div class="activity-list">
      <div
        *ngFor="let activity of activities; let i = index"
        class="activity-item"
      >
        <i
          [ngClass]="['activity-icon', activity.color, 'pi', activity.icon]"
        ></i>
        <div class="activity-content">
          <span class="activity-text">{{ activity.text }}</span>
          <span class="activity-time">{{ activity.time }}</span>
        </div>
      </div>
    </div>
  `,

  host: {
    class: 'layout-card col-item-2',
  },
})
export class RecentActivityWidget {
  
  activities = [
    {
      icon: 'pi-shopping-cart',
      text: 'New order #1123',
      time: '2 minutes ago',
      color: 'pink',
    },
    {
      icon: 'pi-user-plus',
      text: 'New customer registered',
      time: '15 minutes ago',
      color: 'green',
    },
    {
      icon: 'pi-check-circle',
      text: 'Payment processed',
      time: '25 minutes ago',
      color: 'blue',
    },
    {
      icon: 'pi-inbox',
      text: 'Inventory updated',
      time: '40 minutes ago',
      color: 'yellow',
    },
  ];
}
