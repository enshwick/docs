import { z } from 'astro/zod';

/**
 * The facts at the head of a mod's page, which `tools/fetch.ts` writes into its front matter from
 * the mod's player page and release: its id, who needs it, its version, the Enshwick API it needs
 * where its release names one, where its source and its release are, and the package that names its
 * archive.
 */
export const modCardSchema = z.object({
  id: z.string(),
  needs: z.enum(['server', 'everyone', 'client']),
  repository: z.string(),
  folder: z.string(),
  package: z.string(),
  release: z.string(),
  version: z.string().optional(),
  api: z.string().optional(),
});

/** One mod's card facts. */
export type ModCardData = z.input<typeof modCardSchema>;

/** The links on a mod's card, worked out from its card facts. */
export class ModCard {
  /**
   * Where a mod's own archive is: `<package>.zip` in its release. Each mod ships alone; no archive
   * holds several.
   */
  public static archive(mod: Pick<ModCardData, 'repository' | 'release' | 'package'>): string {
    return `https://github.com/${mod.repository}/releases/download/${mod.release}/${mod.package}.zip`;
  }

  /** Where a mod's source is: its folder on the repository's main branch. */
  public static source(mod: Pick<ModCardData, 'repository' | 'folder'>): string {
    return `https://github.com/${mod.repository}/tree/main/${mod.folder}`;
  }
}
