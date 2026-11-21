import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports ok status with an ISO timestamp', () => {
    const result = new HealthController().check();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
