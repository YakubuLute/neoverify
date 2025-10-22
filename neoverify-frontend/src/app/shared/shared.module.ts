import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
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
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SidebarModule } from 'primeng/sidebar';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { StepsModule } from 'primeng/steps';
import { MenuModule } from 'primeng/menu';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MegaMenuModule } from 'primeng/megamenu';
import { SlideMenuModule } from 'primeng/slidemenu';
import { DockModule } from 'primeng/dock';
import { TabMenuModule } from 'primeng/tabmenu';

// Shared Components
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';

const ANGULAR_MODULES = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule
];

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
  InputGroupModule,
  InputGroupAddonModule,
  PasswordModule,
  CheckboxModule,
  RadioButtonModule,
  DropdownModule,
  MultiSelectModule,
  CalendarModule,
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
  OverlayPanelModule,
  SidebarModule,
  TooltipModule,
  FileUploadModule,
  BreadcrumbModule,
  StepsModule,
  MenuModule,
  TieredMenuModule,
  ContextMenuModule,
  MegaMenuModule,
  SlideMenuModule,
  DockModule,
  TabMenuModule
];

const SHARED_COMPONENTS = [
  LoadingSpinnerComponent,
  ConfirmationDialogComponent
];

@NgModule({
  imports: [
    ...ANGULAR_MODULES,
    ...PRIMENG_MODULES,
    ...SHARED_COMPONENTS
  ],
  exports: [
    ...ANGULAR_MODULES,
    ...PRIMENG_MODULES,
    ...SHARED_COMPONENTS
  ]
})
export class SharedModule { }