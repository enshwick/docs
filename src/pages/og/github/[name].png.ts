import type { APIRoute, GetStaticPaths } from 'astro';

import type { OgPage } from '../../../site/og-card.ts';
import { Repositories } from '../../../site/repositories.ts';
import { RepositoryCard } from '../../../site/repository-card.ts';

/** A path per repository the site lists, named as its card is served. */
export const getStaticPaths = (() =>
  Object.entries(Repositories.site.cards).map(([name, card]) => ({
    params: { name },
    props: { card },
  }))) satisfies GetStaticPaths;

/** A repository's social preview at `/og/github/<name>.png`, at the size GitHub asks for. */
export const GET: APIRoute<{ card: OgPage }> = async ({ props }) =>
  new Response(await new RepositoryCard(props.card).png(), {
    headers: { 'Content-Type': 'image/png' },
  });
