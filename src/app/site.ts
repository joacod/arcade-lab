/** Public identity shared by the landing, search metadata and generated social card. */
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
