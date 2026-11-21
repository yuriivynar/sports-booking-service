import request from 'supertest';
import handler from './../src/serverless.js';

describe('Serverless handler (e2e)', () => {
  it('serves GET /api/health through the exported Vercel handler', async () => {
    const res = await request(handler).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('reuses one Nest app across requests on a warm instance', async () => {
    const first = await request(handler).get('/api/health');
    const second = await request(handler).get('/api/health');
    expect([first.status, second.status]).toEqual([200, 200]);
  });
});
