import fs from 'node:fs/promises';
import path from 'node:path';

import { createContentAPIRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    body: { type: 'text' },
  },
};

const writeFileSafe = async (filePath: string, contents: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
};

describe('Audit Logs Plugin (Content API)', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  beforeAll(async () => {
    // Enable the plugin in the generated test app
    const appRoot = path.resolve(__dirname, '../../../../test-apps/api');
    const pluginConfigPath = path.join(appRoot, 'config/plugins.js');
    const pluginResolvePath = path.resolve(
      __dirname,
      '../../../..',
      'packages/plugins/audit-logs/strapi-server.js'
    );

    await writeFileSafe(
      pluginConfigPath,
      `module.exports = {
        'audit-logs': {
          enabled: true,
          resolve: '${pluginResolvePath.replace(/\\/g, '/')}',
          config: { auditLog: { enabled: true, excludeContentTypes: [] } }
        }
      };\n`
    );

    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  test('logs create, update, delete via Content API', async () => {
    // Create
    const createRes = await rq({
      method: 'POST',
      url: '/articles',
      body: { data: { title: 'Hello', body: 'World' } },
    });
    expect(createRes.statusCode).toBe(201);
    const documentId = createRes.body.data.documentId;

    // Update
    const updateRes = await rq({
      method: 'PUT',
      url: `/articles/${documentId}`,
      body: { data: { title: 'Hello2' } },
    });
    expect(updateRes.statusCode).toBe(200);

    // Delete
    const deleteRes = await rq({ method: 'DELETE', url: `/articles/${documentId}` });
    expect([200, 204]).toContain(deleteRes.statusCode);

    // Fetch audit logs
    const logsRes = await rq({ method: 'GET', url: '/audit-logs' });
    expect(logsRes.statusCode).toBe(200);
    const entries = logsRes.body.data;
    expect(Array.isArray(entries)).toBe(true);
    // At least one entry for the create
    expect(entries.some((e: any) => e.action === 'create')).toBe(true);
  });
});


