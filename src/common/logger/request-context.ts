import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string {
  return asyncLocalStorage.getStore()?.requestId ?? '--';
}
