/**
 * Placeholder shared type, used only to prove workspace type-sharing works
 * end-to-end (apps/* import this). Real domain types (Application, Document,
 * calculator I/O shapes, etc.) land alongside the features that need them.
 */
export interface AppInfo {
  name: string;
  version: string;
}
