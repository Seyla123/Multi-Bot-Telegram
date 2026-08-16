export type CrudColumnType = 'text' | 'badge' | 'date' | 'boolean' | 'actions';

export interface CrudColumn {
  name: string;
  label: string;
  type: CrudColumnType;
  formatter?: (value: any, item: Record<string, any>) => string;
  badgeStyle?: (value: any) => string;
}

export interface CrudFieldOption {
  label: string;
  value: string | number | boolean;
}

export type CrudFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'date';

export interface CrudField {
  name: string;
  label: string;
  type: CrudFieldType;
  options?: CrudFieldOption[];
  required?: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  /** If true, never pre-fill this field from existing record (e.g. passwords, tokens) */
  sensitive?: boolean;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}
