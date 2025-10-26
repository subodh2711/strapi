import type { Core } from '@strapi/types';

const parseQuery = (ctx: any) => {
  const { query } = ctx.request;
  const where: any = {};
  const sort = query.sort || 'createdAt:desc';

  if (query.contentType) where.contentType = query.contentType;
  if (query.userId) where.userId = Number(query.userId);
  if (query.action) where.action = query.action;
  if (query.startDate || query.endDate) {
    where.createdAt = {} as any;
    if (query.startDate) where.createdAt.$gte = new Date(query.startDate).toISOString();
    if (query.endDate) where.createdAt.$lte = new Date(query.endDate).toISOString();
  }

  // Pagination
  const page = Number(query['pagination[page]'] ?? query.page ?? 1);
  const pageSize = Number(query['pagination[pageSize]'] ?? query.pageSize ?? 25);
  const offset = (page - 1) * pageSize;

  return { where, sort, page, pageSize, offset };
};

const controller = {
  async find(ctx: Core.KoaContext) {
    const { where, sort, page, pageSize, offset } = parseQuery(ctx);

    const [data, total] = await Promise.all([
      strapi.plugin('audit-logs').service('log').findMany({ where, orderBy: sort, offset, limit: pageSize }),
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
};

export default controller;


