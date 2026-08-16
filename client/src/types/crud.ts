export type CrudColumnType = 'text' | 'badge' | 'date' | 'boolean' | 'actions';

export interface CrudColumn {
  name: string;
  label: string;
  type: CrudColumnType;
  formatter?: (value: any, item: Record<string, any>) => string;
  badgeStyle?: (value: any) => string; // e.g. custom Tailwind color classes for badges
}

export interface CrudFieldOption {
  label: string;
  value: string | number | boolean;
}

export type CrudFieldType = 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'textarea';

export interface CrudField {
  name: string;
  label: string;
  type: CrudFieldType;
  options?: CrudFieldOption[];
  required?: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}
