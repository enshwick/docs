import { z } from 'astro/zod';

/**
 * The facts at the head of a mod's page, which `tools/fetch.ts` writes into its front matter from
 * the mod's player page and release: its id, who needs it, its version, the Enshwick API it needs
 * where its release names one, and where the release is.
 */
export const modCardSchema = z.object({
  id: z.string(),
  needs: z.enum(['server', 'everyone', 'client']),
  repository: z.string(),
  release: z.string(),
  version: z.string().optional(),
  api: z.string().optional(),
});

/** One mod's card facts. */
export type ModCardData = z.input<typeof modCardSchema>;

/** The links on a mod's card, worked out from its card facts. */
export class ModCard {
  /**
   * Where a mod's own archive is: `enshwick-<name>.zip` in its release, `<name>` being its
   * repository's name without `mod-`. Each mod ships alone; no archive holds several.
   */
  public static archive(mod: Pick<ModCardData, 'repository' | 'release'>): string {
    const name = (mod.repository.split('/').at(-1) ?? mod.repository).replace(/^mod-/u, '');

    return `https://github.com/${mod.repository}/releases/download/${mod.release}/enshwick-${name}.zip`;
  }
}
