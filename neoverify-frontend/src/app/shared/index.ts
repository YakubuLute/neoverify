// Re-export everything from shared module for standalone components
export * from './shared.module';
export * from './models/auth.models';
export * from './models/document.models';
export * from './models/common.models';
export * from './utils/form.utils';
export * from './utils/date.utils';
export * from './components/loading-spinner/loading-spinner.component';
export * from './components/confirmation-dialog/confirmation-dialog.component';

// Import array for standalone components
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
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
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { SliderModule } from 'primeng/slider';
import { RatingModule } from 'primeng/rating';
import { DataViewModule } from 'primeng/dataview';
import { PaginatorModule } from 'primeng/paginator';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';
import { AccordionModule } from 'primeng/accordion';
import { TabsModule } from 'primeng/tabs';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { SplitterModule } from 'primeng/splitter';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { PopoverModule } from 'primeng/popover';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { StepsModule } from 'primeng/steps';
import { MenuModule } from 'primeng/menu';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MegaMenuModule } from 'primeng/megamenu';
import { DockModule } from 'primeng/dock';

// Shared Components
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';

export const SHARED_IMPORTS = [
  // Angular modules
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  RouterModule,
  
  // PrimeNG modules
  ButtonModule,
  CardModule,
  ToolbarModule,
  InputTextModule,
  SelectModule,
  DatePickerModule,
  TagModule,
  ToggleSwitchModule,
  InputNumberModule,
  ProgressBarModule,
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
  InputGroupModule,
  InputGroupAddonModule,
  PasswordModule,
  CheckboxModule,
  RadioButtonModule,
  MultiSelectModule,
  SliderModule,
  RatingModule,
  DataViewModule,
  PaginatorModule,
  TreeModule,
  TreeTableModule,
  AccordionModule,
  TabsModule,
  FieldsetModule,
  PanelModule,
  DividerModule,
  SplitterModule,
  ScrollPanelModule,
  PopoverModule,
  DrawerModule,
  TooltipModule,
  FileUploadModule,
  BreadcrumbModule,
  StepsModule,
  MenuModule,
  TieredMenuModule,
  ContextMenuModule,
  MegaMenuModule,
  DockModule,
  
  // Shared components
  LoadingSpinnerComponent,
  ConfirmationDialogComponent
];