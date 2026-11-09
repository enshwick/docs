import { describe, expect, it } from 'vitest';

import { WebAnalytics } from '../web-analytics.ts';

describe('WebAnalytics', () => {
  it.each([
    ['no token', {}],
    ['an empty token', { CF_WEB_ANALYTICS_TOKEN: '' }],
    ['a token of only spaces', { CF_WEB_ANALYTICS_TOKEN: ' \n' }],
  ])('stays off with %s', (_, env) => {
    const analytics = WebAnalytics.fromEnv(env);

    expect(analytics.on).toBe(false);
    expect(analytics.beacon).toBeUndefined();
  });

  it('carries the token without the space or newline pasted around it', () => {
    const analytics = WebAnalytics.fromEnv({ CF_WEB_ANALYTICS_TOKEN: ' abc123\n' });

    expect(analytics.on).toBe(true);
    expect(analytics.beacon).toBe('{"token":"abc123"}');
  });
});
