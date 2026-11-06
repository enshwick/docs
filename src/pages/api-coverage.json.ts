import type { APIRoute } from 'astro';

import { Coverage } from '../site/coverage.ts';

/** The API coverage table at `/api-coverage.json`, the same data the coverage page shows, for tools. */
export const GET: APIRoute = () => Response.json(Coverage.site.json());
