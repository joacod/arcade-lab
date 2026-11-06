/** Public identity shared by the landing, search metadata and generated social card. */
const name = 'Arcade Lab';
const headline = 'Six small worlds. Press play.';
export const site = {
  name,
  headline,
  title: `${name} | ${headline}`,
  socialDescription: 'Original browser games. Keyboard or touch. Pick your escape.',
  description: 'Six original browser games. Survive the night, take to the skies, explore clockwork gardens and fight your way home. Play with keyboard or touch.',
  url: 'https://arcade.joacod.com/',
  repository: 'https://github.com/joacod/arcade-lab',
  socialAlt: 'Arcade Lab: six original browser games, with gameplay screenshots from the full collection.',
} as const;
