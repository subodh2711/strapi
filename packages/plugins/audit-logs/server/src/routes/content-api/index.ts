import { createContentApiRoutesFactory } from '@strapi/utils';

const createContentApiRoutes = createContentApiRoutesFactory(() => {
  return [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'logs.find',
      config: {
        auth: false,
      },
      info: { type: 'content-api' },
    },
  ];
});

export default createContentApiRoutes;


