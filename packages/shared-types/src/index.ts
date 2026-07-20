/**
 * Placeholder shared type, used only to prove workspace type-sharing works
 * end-to-end (apps/* import this). Real domain types (Application, Document,
 * calculator I/O shapes, etc.) land alongside the features that need them.
 */
export interface AppInfo {
  name: string;
  version: string;
}

// Generated from apps/api/openapi.json via `pnpm --filter @mara/shared-types generate:api`.
// Regenerate whenever API routes/DTOs change; CI drift-checks are a later hardening task.
export type { paths, components, operations } from './api-schema';
