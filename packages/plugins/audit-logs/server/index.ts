import routes from './routes';
import controllers from './controllers';
import services from './services';
import { config } from './config';

export default {
  routes,
  controllers,
  services,
  config,
  async register({ strapi }: any) {
    // register documents middleware lifecycle
    strapi.plugin('audit-logs').service('lifecycle').register();
  },
};


