import { n } from '@horizon-republic/nominal-types';

import linksData from '../data/links.json' with { type: 'json' };
import { Address, Mailbox } from './types.ts';

/**
 * The places outside the site that the header, the footer and the front page link to, from
 * `src/data/links.json`. A link to a page that does not exist yet (the Vortex extension) points at
 * the nearest real page until its own appears; changing it here changes it everywhere.
 */
export class Links {
  private static readonly schema = n.object({
    github: Address,
    nexus: Address,
    vortex: Address,
    download: Address,
    license: Address,
    issues: Address,
    contact: Mailbox,
    security: Mailbox,
  });

  public readonly github: Address;
  public readonly nexus: Address;
  public readonly vortex: Address;
  public readonly download: Address;
  public readonly license: Address;
  public readonly issues: Address;
  public readonly contact: Mailbox;
  public readonly security: Mailbox;

  public constructor(data: unknown) {
    const parsed = Links.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/links.json: ${JSON.stringify(parsed.issues)}`);
    }

    ({
      github: this.github,
      nexus: this.nexus,
      vortex: this.vortex,
      download: this.download,
      license: this.license,
      issues: this.issues,
      contact: this.contact,
      security: this.security,
    } = parsed.value);
  }

  /** A new issue on the site's repository, its title and body filled in for the reader. */
  public issue(title: string, body: string): string {
    const query = new URLSearchParams({ title, body });

    return `${this.issues}?${query.toString().replaceAll('+', '%20')}`;
  }
}

/** The site's outside links, as `src/data/links.json` holds them. */
export const links = new Links(linksData);
