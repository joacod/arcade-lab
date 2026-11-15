import { getTarget, type TargetId } from './content.ts';
import type { Run } from './game.ts';
import type { JournalEntry } from './journal.ts';

interface TopicDefinition { id: string; label: string; children?: readonly TopicDefinition[] }
const trees: Partial<Record<TargetId, readonly TopicDefinition[]>> = {
  evelyn: [
    { id: 'evelyn-case', label: 'What changed when the restoration began?' },
    { id: 'evelyn-family', label: 'Tell me about the housekeeper and her music box.', children: [
      { id: 'evelyn-photo', label: 'What does the photograph mean to her?' },
      { id: 'evelyn-key', label: 'May I borrow the household cabinet key?' },
    ] },
  ],
  vale: [
    { id: 'vale-case', label: 'What exactly did you hire me to remove?' },
    { id: 'vale-voice', label: 'Was that your voice upstairs?' },
    { id: 'vale-mark', label: 'Your mark is on these new fittings.' },
    { id: 'confront', label: 'The screams are staged. The ghosts are guards.' },
  ],
  oswald: [
    { id: 'oswald-chain', label: 'Why are you dragging that chain?' },
    { id: 'oswald-portrait', label: 'Can this portrait house a loose spirit?' },
    { id: 'oswald-ward', label: 'What is behind the bell door?' },
  ],
  brindle: [
    { id: 'brindle-memory', label: 'What happened at the bell?' },
    { id: 'brindle-family', label: 'How long have you cared for the family?' },
  ],
};
function flatten(list: readonly TopicDefinition[]): TopicDefinition[] {
  return list.flatMap(topic => [topic, ...flatten(topic.children ?? [])]);
}
const definitions = Object.values(trees).flatMap(list => flatten(list));
export const greetingKey = (person: TargetId) => `greeting:${person}`;
export const responseKeys = [
  ...Object.keys(trees).map(person => greetingKey(person as TargetId)),
  ...definitions.flatMap(({ id }) => id === 'vale-case' || id === 'oswald-ward'
    ? [id, `${id}:confronted`] : id === 'brindle-memory' ? [id, `${id}:ready`] : [id]),
];

/** Recognize the named introductions retained by saves from before one-time greetings. */
export function earlierGreetings(journal: readonly JournalEntry[]): string[] {
  return (Object.keys(trees) as TargetId[]).filter(person => journal.some(entry => entry.title === getTarget(person).name)).map(greetingKey);
}

/** Older saves identified answers by topic titles and prose, before stable response keys existed. */
export function earlierAnswers(journal: readonly JournalEntry[]): string[] {
  const answered = new Set<string>();
  for (const [person, tree] of Object.entries(trees)) {
    for (const topic of flatten(tree)) {
      const title = `${getTarget(person as TargetId).name} · ${topic.label}`;
      for (const entry of journal.filter(entry => entry.title === title)) {
        // Use the recorded response, never current progress, to distinguish old answer variants.
        const text = entry.lines[0]!.text;
        const changed = topic.id === 'vale-case' && text.startsWith('I thought I would command it.')
          || topic.id === 'oswald-ward' && text.startsWith('The Guest is too strong for your lantern');
        answered.add(changed ? `${topic.id}:confronted` : topic.id);
      }
    }
  }
  return [...answered];
}

export function responseKey(run: Run, id: string) {
  if ((id === 'vale-case' || id === 'oswald-ward') && run.facts.includes('confronted')) return `${id}:confronted`;
  if (id === 'brindle-memory' && run.facts.includes('music') && run.facts.includes('photoLit')) return `${id}:ready`;
  return id;
}
function available(run: Run, topic: TopicDefinition): boolean {
  const has = (fact: Run['facts'][number]) => run.facts.includes(fact);
  if (topic.id === 'vale-mark' && !has('mark')) return false;
  if (topic.id === 'confront' && (!has('fraud') || !has('guardians') || has('confronted'))) return false;
  if (topic.id === 'brindle-memory' && has('testimony')) return false;
  return !run.asked.includes(responseKey(run, topic.id)) || !!topic.children?.some(child => available(run, child));
}
export function topics(run: Run, person: TargetId): TopicDefinition[] {
  const parent = run.topicPath.at(-1);
  const choices = parent ? definitions.find(topic => topic.id === parent)?.children : trees[person];
  return (choices ?? []).filter(topic => available(run, topic));
}
/** Exhausted subtrees return to their parent; unfinished siblings remain reachable. */
export function returnToAvailableTopics(run: Run) {
  while (run.conversation && run.topicPath.length && !topics(run, run.conversation).length) run.topicPath.pop();
}
