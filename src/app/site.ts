import type { GameInfo } from './catalog-data.ts';
import { gamePath } from './routes.ts';

/** Public identity shared by the landing, search metadata and generated social cards. */
const name = 'Arcade Lab';
const headline = 'Small worlds. Press play.';
const introduction = 'Classic-inspired games, with a personal twist.';
export const site = {
  name,
  headline,
  introduction,
  title: `${name} | ${headline}`,
  socialDescription: `${introduction} Keyboard or touch.`,
  description: `${introduction} Play in your browser with keyboard or touch.`,
  url: 'https://arcade.joacod.com/',
  repository: 'https://github.com/joacod/arcade-lab',
  socialAlt: 'Arcade Lab: classic-inspired browser games, with gameplay screenshots from the collection.',
} as const;

export function pageMetadata(game?: GameInfo) {
  const title = game ? `${game.title} | ${site.name}` : site.title;
  const description = game ? `${game.description} Play in your browser with keyboard or touch.` : site.description;
  const url = game ? new URL(gamePath(game), site.url).href : site.url;
  const image = new URL(game ? `social/${game.slug}.png` : 'social.png', site.url).href;
  const alt = game ? `${game.title}: gameplay from ${site.name}.` : site.socialAlt;
  return {
    title, description, url,
    openGraph: { 'og:type': 'website', 'og:site_name': site.name, 'og:title': title,
      'og:description': description, 'og:url': url, 'og:image': image,
      'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': alt },
    twitter: { 'twitter:card': 'summary_large_image', 'twitter:title': title,
      'twitter:description': description, 'twitter:image': image, 'twitter:image:alt': alt },
    schema: game
      ? { '@context': 'https://schema.org', '@type': 'VideoGame', name: game.title, url, description,
        image, genre: game.genre, gamePlatform: 'Web browser', applicationCategory: 'Game' }
      : { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url,
        description, sameAs: site.repository },
  };
}
