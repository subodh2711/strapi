import type { Core } from '@strapi/types';

type SaveParams = {
  contentType: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  userId?: number;
  diff: unknown;
  createdAt: string;
};

const createLogService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async save(event: SaveParams) {
    await strapi.db.query('plugin::audit-logs.audit-log').create({
      data: event,
    });
  },

  async findMany(query: any) {
    return strapi.db.query('plugin::audit-logs.audit-log').findMany(query);
  },

  async count(where: any) {
    return strapi.db.query('plugin::audit-logs.audit-log').count({ where });
  },
});

export default createLogService;


