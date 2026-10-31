import { AnyString, n } from '@horizon-republic/nominal-types';

import { Languages } from './languages.ts';

/** The part of the site a page belongs to: the player area at the root, or the developer area. */
export class Area extends AnyString.subtype('docs.Area', n.oneOf('players', 'dev')) {
  private static readonly developerFolder = 'dev';

  /** The area of a page by its content id, such as `uk/dev/hooks`. */
  public static of(id: string): Area {
    const [first, second] = id.split('/');
    const folder = Languages.site.others.some((code) => code.toString() === first) ? second : first;

    return new Area(folder === Area.developerFolder ? 'dev' : 'players');
  }
}
