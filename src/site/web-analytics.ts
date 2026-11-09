/**
 * Cloudflare Web Analytics, on only when the build has `CF_WEB_ANALYTICS_TOKEN`; the head renders
 * its beacon and the footer its notice from this one switch, so the two never disagree.
 */
export class WebAnalytics {
  /** Cloudflare's beacon, which counts visits without cookies and follows the client router itself. */
  public static readonly script = 'https://static.cloudflareinsights.com/beacon.min.js';

  private static readonly variable = 'CF_WEB_ANALYTICS_TOKEN';

  /** The site's analytics, from the build's environment; only the deploy build sets the token. */
  public static readonly site = WebAnalytics.fromEnv(Bun.env);

  /** The beacon's `data-cf-beacon` value, or `undefined` when the build counts nothing. */
  public readonly beacon: string | undefined;

  private constructor(token: string) {
    this.beacon = token === '' ? undefined : JSON.stringify({ token });
  }

  /** Reads the token once; a pasted space or newline around it would make Cloudflare drop every count. */
  public static fromEnv(env: Record<string, string | undefined>): WebAnalytics {
    return new WebAnalytics((env[WebAnalytics.variable] ?? '').trim());
  }

  /** Whether pages carry the beacon and the footer says visits are counted. */
  public get on(): boolean {
    return this.beacon !== undefined;
  }
}
