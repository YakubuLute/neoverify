import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenubarModule } from 'primeng/menubar';
import { PanelMenuModule } from 'primeng/panelmenu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';

const PRIMENG_MODULES = [
  ButtonModule,
  CardModule,
  ToolbarModule,
  InputTextModule,
  SelectModule,
  TableModule,
  DialogModule,
  ToastModule,
  ConfirmDialogModule,
  ProgressSpinnerModule,
  MenubarModule,
  PanelMenuModule,
  AvatarModule,
  BadgeModule,
  RippleModule,
];

@NgModule({
  imports: [
    CommonModule,
    ...PRIMENG_MODULES
  ],
  exports: [
    CommonModule,
    ...PRIMENG_MODULES
  ]
})
export class SharedModule { }
