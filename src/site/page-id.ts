import { AnyString } from '@horizon-republic/nominal-types';

import { Languages } from './languages.ts';

/** A page of the site by its content id, such as `uk/dev/hooks`; the root front page's is empty. */
export class PageId extends AnyString.subtype('docs.PageId', /^\S*$/u) {
  private static readonly index = 'index';

  /** Whether the page is a front page in any language, which draws its own heading and night. */
  public get isFront(): boolean {
    return (
      this.value === '' ||
      this.value === PageId.index ||
      Languages.site.others.some(
        (code) => this.value === code.toString() || this.value === `${code}/${PageId.index}`,
      )
    );
  }
}
