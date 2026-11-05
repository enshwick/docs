import { AnyBoolean, AnyString, n } from '@horizon-republic/nominal-types';

/** A site language by its code, the name of its folder under the content root. */
export class LanguageCode extends AnyString.subtype(
  'docs.LanguageCode',
  /^[a-z]{2,3}(-[A-Z]{2})?$/u,
) {}

/** A GitHub repository as `owner/name`, the form every source names. */
export class RepositoryName extends AnyString.subtype(
  'docs.RepositoryName',
  /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/u,
) {
  /** The repository's page on GitHub. */
  public get url(): string {
    return `https://github.com/${this}`;
  }

  /** The repository's name without its owner. */
  public get name(): string {
    return this.value.slice(this.value.indexOf('/') + 1);
  }
}

/** A branch or tag a source is read at. */
export class GitRef extends AnyString.subtype('docs.GitRef', /^[A-Za-z0-9._/-]+$/u) {}

/**
 * A mod's id as its manifest gives it: `<author>.<name>`, each part of `[a-z0-9-]`, at most 64
 * characters in all. Mirrors `is_valid_id` of the API crate; the build checks the two agree.
 */
export class ModId extends AnyString.subtype(
  'docs.ModId',
  /^(?=.{3,64}$)[a-z0-9-]+\.[a-z0-9-]+$/u,
) {}

/** A text key of `src/data/texts.json`. */
export class TextKey extends AnyString.subtype('docs.TextKey', /^[a-z0-9.-]+$/u) {}

/** One language of the site, as `src/data/languages.json` lists it. */
export const LanguageEntry = n.object({
  code: LanguageCode,
  label: AnyString,
  default: n.of(AnyBoolean).optional(),
});

/** The language word after a code fence's backticks, such as `rust` or `luau`. */
export class FenceName extends AnyString.subtype('docs.FenceName', /^[a-z][a-z0-9+-]*$/u) {}

/** The label of a mod language's tab; it goes into a CSS attribute selector, so it has no quote or backslash. */
export class ModLanguageLabel extends AnyString.subtype('docs.ModLanguageLabel', /^[^"\\\n]+$/u) {}

/** One language mods are written in, as `src/data/mod-languages.json` lists it; its first fence marks a block for it. */
export const ModLanguageEntry = n.object({
  label: ModLanguageLabel,
  fences: n.of(FenceName).array({ min: 1 }),
});

/** One version of the developer area: an API minor and the platform ref it is read at. */
export const PlatformVersion = n.object({ name: AnyString, ref: GitRef });

/** Where the site's generated pages come from, as `src/data/sources.json` names it. */
export const Sources = n.object({
  platform: n.object({
    repository: RepositoryName,
    book: AnyString,
    versions: PlatformVersion.array({ min: 1 }),
  }),
  mods: n.object({ repository: RepositoryName }),
});

/** A web address the site links to. */
export class Address extends AnyString.subtype('docs.Address', /^https:\/\/[^\s]+$/u) {}

/** A mailbox the site names. */
export class Mailbox extends AnyString.subtype('docs.Mailbox', /^[a-z0-9.-]+@[a-z0-9.-]+$/u) {
  /** The `mailto:` link, with a subject and a body when given. */
  public mailto(subject?: string, body?: string): string {
    const query = new URLSearchParams();

    if (subject !== undefined) {
      query.set('subject', subject);
    }

    if (body !== undefined) {
      query.set('body', body);
    }

    const search = query.toString().replaceAll('+', '%20');

    return search === '' ? `mailto:${this}` : `mailto:${this}?${search}`;
  }
}
