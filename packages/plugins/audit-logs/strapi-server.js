'use strict';

const defaultConfig = {
  auditLog: {
    enabled: true,
    excludeContentTypes: [],
  },
};

const contentTypes = {
  'audit-log': {
    schema: {
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
      indexes: [
        { name: 'idx_audit_logs_ct', columns: ['content_type'] },
        { name: 'idx_audit_logs_user', columns: ['user_id'] },
        { name: 'idx_audit_logs_action', columns: ['action'] },
        { name: 'idx_audit_logs_created_at', columns: ['created_at'] },
      ],
    },
  },
};

const computeDiff = (beforeData, afterData) => {
  try {
    if (!beforeData) return { after: afterData };
    if (!afterData) return { before: beforeData };
    const diff = {};
    const keys = new Set([...(Object.keys(beforeData || {})), ...(Object.keys(afterData || {}))]);
    keys.forEach((key) => {
      const b = beforeData?.[key];
      const a = afterData?.[key];
      const changed = JSON.stringify(b) !== JSON.stringify(a);
      if (changed) diff[key] = { before: b, after: a };
    });
    return diff;
  } catch (e) {
    return { before: beforeData, after: afterData };
  }
};

const shouldLogForUid = (strapi, uid) => {
  const enabled = strapi.config.get('plugin::audit-logs.auditLog.enabled', true);
  if (!enabled) return false;
  const excluded = strapi.config.get('plugin::audit-logs.auditLog.excludeContentTypes', []);
  return !excluded.includes(uid);
};

const services = {
  lifecycle: ({ strapi }) => ({
    register() {
      strapi.documents.use(async (ctx, next) => {
        const { action, contentType } = ctx;
        const uid = contentType.uid;
        if (!['create', 'update', 'delete'].includes(action)) return next();
        if (!shouldLogForUid(strapi, uid)) return next();

        let before = null;
        if ((action === 'update' || action === 'delete') && ctx.params?.documentId) {
          try {
            before = await strapi.documents(uid).findOne({ documentId: ctx.params.documentId, status: 'draft' });
          } catch {}
        }

        const result = await next();

        const recordId = (result && result.documentId) || ctx.params?.documentId || (result && result.id) || undefined;
        const requestState = strapi.requestContext.get()?.state;
        const isContentApi = requestState?.route?.info?.type === 'content-api';
        const userId = isContentApi ? requestState?.user?.id : undefined;

        const payload = action === 'create' ? { after: result } : action === 'delete' ? { before } : computeDiff(before, result);

        await strapi.plugin('audit-logs').service('log').save({
          contentType: uid,
          recordId: String(recordId || ''),
          action,
          userId,
          diff: payload,
          createdAt: new Date().toISOString(),
        });

        return result;
      });
    },
  }),

  log: ({ strapi }) => ({
    async save(event) {
      await strapi.db.query('plugin::audit-logs.audit-log').create({ data: event });
    },
    async findMany(query) {
      return strapi.db.query('plugin::audit-logs.audit-log').findMany(query);
    },
    async count(where) {
      return strapi.db.query('plugin::audit-logs.audit-log').count({ where });
    },
  }),
};

const controllers = {
  logs: {
    async find(ctx) {
      const { query } = ctx.request;
      const where = {};
      const sort = query.sort || 'createdAt:desc';
      const orderBy = Array.isArray(sort)
        ? sort.map((s) => {
            const [field, dir] = String(s).split(':');
            return { [field]: (dir || 'desc').toLowerCase() };
          })
        : [(() => {
            const [field, dir] = String(sort).split(':');
            return { [field]: (dir || 'desc').toLowerCase() };
          })()];
      if (query.contentType) where.contentType = query.contentType;
      if (query.userId) where.userId = Number(query.userId);
      if (query.action) where.action = query.action;
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.$gte = new Date(query.startDate).toISOString();
        if (query.endDate) where.createdAt.$lte = new Date(query.endDate).toISOString();
      }
      const page = Number(query['pagination[page]'] ?? query.page ?? 1);
      const pageSize = Number(query['pagination[pageSize]'] ?? query.pageSize ?? 25);
      const offset = (page - 1) * pageSize;

      const [data, total] = await Promise.all([
        strapi.plugin('audit-logs').service('log').findMany({ where, orderBy, offset, limit: pageSize }),
        strapi.plugin('audit-logs').service('log').count(where),
      ]);

      ctx.body = {
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.ceil(total / pageSize),
            total,
          },
        },
      };
    },
  },
};

const { createContentApiRoutesFactory } = require('@strapi/utils');

const contentApiRoutes = createContentApiRoutesFactory(() => [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'logs.find',
    config: {
      auth: false,
      prefix: '',
    },
    info: { type: 'content-api', pluginName: 'audit-logs' },
  },
]);

const routes = {
  'content-api': contentApiRoutes,
};

module.exports = {
  routes,
  controllers,
  services,
  contentTypes,
  config: { default: defaultConfig },
  async register({ strapi }) {
    strapi.plugin('audit-logs').service('lifecycle').register();
  },
};


