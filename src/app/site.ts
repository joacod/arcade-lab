/** Public identity shared by the landing, search metadata and generated social card. */
const name = 'Arcade Lab';
const headline = 'Small worlds. Press play.';
export const site = {
  name,
  headline,
  title: `${name} | ${headline}`,
  socialDescription: 'Original browser games. Keyboard or touch. Pick your escape.',
  description: 'Original browser games. Survive the night, fly through sky ruins, explore clockwork gardens and fight your way home. Play with keyboard or touch.',
  url: 'https://arcade.joacod.com/',
  repository: 'https://github.com/joacod/arcade-lab',
  socialAlt: 'Arcade Lab: original browser games, with gameplay screenshots from the collection.',
} as const;
