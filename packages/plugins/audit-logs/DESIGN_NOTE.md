## Design Summary

This plugin hooks into the Documents Service middleware (`strapi.documents.use`) to capture Content API operations: create, update, delete.

For each operation, it resolves the user from `strapi.requestContext.get().state` only when the request route type is `content-api`. It stores logs in the collection `audit_logs` with indexes on content type, user, action and timestamp.

It exposes a Content API endpoint `GET /audit-logs` with scope `plugin::audit-logs.read_audit_logs` and supports filters for content type, user id, action, and date range, plus pagination and sorting.

Configuration is under `plugin.audit-logs.auditLog` with `enabled` and `excludeContentTypes`.


