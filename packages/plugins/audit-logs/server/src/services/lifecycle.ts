import type { Core, Modules, UID } from '@strapi/types';

type Middleware = Modules.Documents.Middleware.Middleware;

const shouldLogForUid = (strapi: Core.Strapi, uid: string) => {
  const enabled = strapi.config.get('plugin.audit-logs.auditLog.enabled', true);
  if (!enabled) return false;
  const excluded: string[] = strapi.config.get('plugin.audit-logs.auditLog.excludeContentTypes', []);
  return !excluded.includes(uid);
};

const computeDiff = (beforeData: any, afterData: any) => {
  try {
    if (!beforeData) return { after: afterData };
    if (!afterData) return { before: beforeData };
    const diff: Record<string, { before: any; after: any }> = {};
    const keys = new Set([...Object.keys(beforeData || {}), ...Object.keys(afterData || {})]);
    keys.forEach((key) => {
      const b = (beforeData as any)[key];
      const a = (afterData as any)[key];
      const changed = JSON.stringify(b) !== JSON.stringify(a);
      if (changed) diff[key] = { before: b, after: a };
    });
    return diff;
  } catch {
    return { before: beforeData, after: afterData };
  }
};

const createLifecycle = ({ strapi }: { strapi: Core.Strapi }) => {
  const middleware: Middleware = async (ctx, next) => {
    const { action, contentType } = ctx;
    const uid = (contentType as any).uid as UID.ContentType;
    if (!['create', 'update', 'delete'].includes(action)) return next();
    if (!shouldLogForUid(strapi, uid)) return next();

    // Capture pre-state for update/delete
    let before: any = null;
    if (action === 'update' || action === 'delete') {
      if (ctx.params?.documentId) {
        try {
          before = await strapi.documents(uid).findOne({ documentId: ctx.params.documentId, status: 'draft' } as any);
        } catch {}
      }
    }

    const result: any = await next();

    // Determine record id and compute diff
    const recordId =
      (result && (result as any).documentId) || ctx.params?.documentId || (result && (result as any).id) || undefined;

    const requestState = strapi.requestContext.get()?.state;
    const isContentApi = requestState?.route?.info?.type === 'content-api';
    const userId = isContentApi ? requestState?.user?.id : undefined;

    const payload =
      action === 'create' ? { after: result } : action === 'delete' ? { before } : computeDiff(before, result);

    // Save log
    await strapi.plugin('audit-logs').service('log').save({
      contentType: uid,
      recordId: String(recordId || ''),
      action: action as 'create' | 'update' | 'delete',
      userId,
      diff: payload,
      createdAt: new Date().toISOString(),
    });

    return result;
  };

  return {
    register() {
      strapi.documents.use(middleware);
    },
  };
};

export default createLifecycle;


