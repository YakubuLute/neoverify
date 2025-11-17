/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [SHARED_IMPORTS],
  templateUrl: './user-management.component.scss'
})
export class UserManagementComponent {
  users = [
    { name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { name: 'Bob Johnson', email: 'bob@example.com', role: 'User' },
    { name: 'Alice Johnson', email: 'alice@example.com', role: 'User' },
    { name: 'Charlie Brown', email: 'charlie@example.com', role: 'User' },
    { name: 'David Davis', email: 'david@example.com', role: 'User' },
    { name: 'Eve Wilson', email: 'eve@example.com', role: 'User' },
    { name: 'Frank Johnson', email: 'frank@example.com', role: 'User' },
    { name: 'Grace Davis', email: 'grace@example.com', role: 'User' },
    { name: 'Hannah Brown', email: 'hannah@example.com', role: 'User' },
    { name: 'Ian Wilson', email: 'ian@example.com', role: 'User' },
    { name: 'Julia Davis', email: 'julia@example.com', role: 'User' },
    { name: 'Kevin Brown', email: 'kevin@example.com', role: 'User' },
    { name: 'Lily Wilson', email: 'lily@example.com', role: 'User' },
    { name: 'Mark Davis', email: 'mark@example.com', role: 'User' },
    { name: 'Nancy Brown', email: 'nancy@example.com', role: 'User' },
    { name: 'Oliver Wilson', email: 'oliver@example.com', role: 'User' },
    { name: 'Pamela Davis', email: 'pamela@example.com', role: 'User' },
    { name: 'Quinn Brown', email: 'quinn@example.com', role: 'User' },
    { name: 'Ryan Wilson', email: 'ryan@example.com', role: 'User' },
    { name: 'Sophia Davis', email: 'sophia@example.com', role: 'User' },
    { name: 'Tom Brown', email: 'tom@example.com', role: 'User' },
    { name: 'Uma Wilson', email: 'uma@example.com', role: 'User' },
    { name: 'Victor Davis', email: 'victor@example.com', role: 'User' },
    { name: 'Wendy Brown', email: 'wendy@example.com', role: 'User' },
    { name: 'Xander Wilson', email: 'xander@example.com', role: 'User' },
    { name: 'Yara Davis', email: 'yara@example.com', role: 'User' },
    { name: 'Zack Brown', email: 'zack@example.com', role: 'User' },
  ];


  roles = [
    { label: 'Admin', value: 'Admin' },
    { label: 'User', value: 'User' },
    { label: 'Editor', value: 'Editor' }
  ];

  statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ];

  selectedRole: string = '';
  selectedStatus: string = '';
  rows: number = 5;
  totalRecords: number = this.users.length;

  selectedUsers: any[] = [];

  addUser() {
    console.log('Add new user');
  }

  editUser(user: any) {
    console.log('Editing user:', user);
  }

  deleteUser(user: any) {
    console.log('Deleting user:', user);
  }

  viewDetails(user: any) {
    console.log('Viewing details for user:', user);
  }

  toggleSelectAll() {
    if (this.selectedUsers.length === this.users.length) {
      this.selectedUsers = [];
    } else {
      this.selectedUsers = [...this.users];
    }
  }

  toggleUserSelection(user: any) {
    if (this.selectedUsers.includes(user)) {
      this.selectedUsers = this.selectedUsers.filter(u => u !== user);
    } else {
      this.selectedUsers.push(user);
    }
  }

  isAllSelected() {
    return this.selectedUsers.length === this.users.length;
  }

  isUserSelected(user: any) {
    return this.selectedUsers.includes(user);
  }

  bulkDelete() {
    console.log('Bulk delete for selected users');
  }

  bulkRoleChange() {
    console.log('Bulk role change for selected users');
  }

  onPageChange(event: any) {
    console.log('Page changed:', event);
  }
}
