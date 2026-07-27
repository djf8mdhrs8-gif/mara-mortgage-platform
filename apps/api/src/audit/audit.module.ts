import { Global, Module } from '@nestjs/common';

import { AuditService } from './audit.service';

// Global: audit logging is cross-cutting (auth, documents, applications) and
// should be injectable anywhere without ceremony.
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
