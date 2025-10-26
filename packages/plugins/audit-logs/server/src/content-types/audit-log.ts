import type { Struct } from '@strapi/types';

const schema: Struct.Schema = {
  kind: 'collectionType',
  collectionName: 'audit_logs',
  info: {
    singularName: 'audit-log',
    pluralName: 'audit-logs',
    displayName: 'Audit Log',
    description: 'Audit logs for Content API operations',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    contentType: { type: 'string', required: true, configurable: false },
    recordId: { type: 'string', required: true, configurable: false },
    action: { type: 'enumeration', enum: ['create', 'update', 'delete'], required: true },
    userId: { type: 'integer' },
    diff: { type: 'json' },
    createdAt: { type: 'datetime' },
  },
  // experimental indexes supported in repo
  indexes: [
    { name: 'idx_audit_logs_ct', columns: ['contentType'] },
    { name: 'idx_audit_logs_user', columns: ['userId'] },
    { name: 'idx_audit_logs_action', columns: ['action'] },
    { name: 'idx_audit_logs_created_at', columns: ['createdAt'] },
  ],
};

export default schema;


