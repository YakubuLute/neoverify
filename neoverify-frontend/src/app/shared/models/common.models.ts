/**
 * Common interfaces and types used across the application
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: string;
}

export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'actions';
}

export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface SortCriteria {
  field: string;
  order: 'asc' | 'desc';
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  filters?: FilterCriteria[];
  sort?: SortCriteria[];
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: LoadingState;
  error: string | null;
}