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

/** A mod's id, as in its manifest. */
export class ModId extends AnyString.subtype('docs.ModId', /^[a-z0-9][a-z0-9-]*$/u) {}

/** A text key of `src/data/texts.json`. */
export class TextKey extends AnyString.subtype('docs.TextKey', /^[a-z0-9.-]+$/u) {}

/** One language of the site, as `src/data/languages.json` lists it. */
export const LanguageEntry = n.object({
  code: LanguageCode,
  label: AnyString,
  default: n.of(AnyBoolean).optional(),
});

/** A Diátaxis page type. */
export class PageTypeName extends AnyString.subtype(
  'docs.PageTypeName',
  n.oneOf('tutorial', 'how-to', 'reference', 'explanation'),
) {}

/** One version of the developer area: an API minor and the platform ref it is read at. */
export const PlatformVersion = n.object({ name: AnyString, ref: GitRef });

/** Where the site's generated pages come from, as `src/data/sources.json` names it. */
export const Sources = n.object({
  platform: n.object({
    repository: RepositoryName,
    book: AnyString,
    versions: PlatformVersion.array({ min: 1 }),
    pageTypes: n.record(AnyString, PageTypeName),
  }),
  mods: n.of(RepositoryName).array({ unique: true }),
});
