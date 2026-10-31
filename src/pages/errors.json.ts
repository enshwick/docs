import type { APIRoute } from 'astro';

import errors from '../generated/errors.json';

/** Every loader error code with its page, cause and fix, at `/errors.json`, for tools to read. */
export const GET: APIRoute = () => Response.json(errors);
