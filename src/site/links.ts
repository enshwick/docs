import { n } from '@horizon-republic/nominal-types';

import linksData from '../data/links.json' with { type: 'json' };
// A static import, so the build bundles it; `tools/fetch.ts` writes it before every build.
import releaseArchivesData from '../generated/release-archives.json' with { type: 'json' };
import { ReleaseArchives } from './release-archives.ts';
import { Address, Mailbox } from './types.ts';

/**
 * The places outside the site that the header, the footer and the front page link to, from
 * `src/data/links.json`; changing one there changes it everywhere.
 */
export class Links {
  private static readonly schema = n.object({
    github: Address,
    download: Address,
    license: Address,
    issues: Address,
    ideas: Address,
    contributing: Address,
    contact: Mailbox,
    security: Mailbox,
  });

  /** The site's outside links, as `src/data/links.json` holds them, the download pinned to its release. */
  public static readonly site = new Links(linksData, new ReleaseArchives(releaseArchivesData));

  public readonly github: Address;
  public readonly download: Address;
  public readonly license: Address;
  public readonly issues: Address;
  /** A new issue on the platform's repository, where mod makers ask for an API or share an idea. */
  public readonly ideas: Address;
  public readonly contributing: Address;
  public readonly contact: Mailbox;
  public readonly security: Mailbox;

  public constructor(data: unknown, archives: ReleaseArchives) {
    const parsed = Links.schema.parse(data);

    if (!parsed.ok) {
      throw new TypeError(`src/data/links.json: ${JSON.stringify(parsed.issues)}`);
    }

    ({
      github: this.github,
      download: this.download,
      license: this.license,
      issues: this.issues,
      ideas: this.ideas,
      contributing: this.contributing,
      contact: this.contact,
      security: this.security,
    } = parsed.value);
    this.download = new Address(archives.pin(this.download.toString()));
  }

  /** A new issue on the site's repository, its title and body filled in for the reader. */
  public issue(title: string, body: string): string {
    const query = new URLSearchParams({ title, body });

    return `${this.issues}?${query.toString().replaceAll('+', '%20')}`;
  }
}
