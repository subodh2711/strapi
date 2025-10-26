import { createContentApiRoutesFactory } from '@strapi/utils';

const createContentApiRoutes = createContentApiRoutesFactory(() => {
  return [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'logs.find',
      config: {
        auth: { scope: ['plugin::audit-logs.read_audit_logs'] },
      },
      info: { type: 'content-api' },
    },
  ];
});

export default createContentApiRoutes;


