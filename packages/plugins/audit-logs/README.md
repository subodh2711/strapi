# Audit Logs (Content API)

Adds automated audit logging for Content API create, update, delete operations.

- Endpoint: GET /audit-logs (Content API)
- Scope required: plugin::audit-logs.read_audit_logs
- Config:
  - plugin.audit-logs.auditLog.enabled (default true)
  - plugin.audit-logs.auditLog.excludeContentTypes (array of UIDs)
