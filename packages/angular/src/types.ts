import { TableCore } from '@lamesa/core';

export interface LaMesaContext<T = any> {
  $implicit: TableCore;
  laMesa: TableCore;
}