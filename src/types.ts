import type { ComponentType } from 'react';

export interface PrintRoute {
  path: string;
  label: string;
  Component: ComponentType;
}
