import { rooms, invitation, type Line, type RoomId } from './content.ts';

export interface JournalEntry { title: string; room?: RoomId; lines: Line[] }
const ENTRY_LIMIT = 128;
export function beginEntry(journal: JournalEntry[], title: string, room: RoomId, line: Line) {
  journal.push({ title, room, lines: [{ ...line }] });
}
export function finishEntry(journal: JournalEntry[]) {
  const latest = journal.at(-1);
  if (latest && journal.slice(0, -1).some(entry => JSON.stringify(entry) === JSON.stringify(latest))) journal.pop();
  if (journal.length > ENTRY_LIMIT) journal.splice(journal.findIndex(entry => entry.title !== invitation.title), 1);
}
/** Received documents remain complete even when their reading panel is dismissed. */
export function retainInvitation(journal: JournalEntry[]) {
  if (journal.some(entry => entry.title === invitation.title)) return false;
  journal.unshift({ title: invitation.title, room: 'hall', lines: invitation.lines.map(line => ({ ...line })) });
  if (journal.length > ENTRY_LIMIT) journal.splice(1, 1);
  return true;
}
export function matchesEntry(entry: JournalEntry, query: string) {
  const text = [entry.title, entry.room ? rooms[entry.room].name : '', ...entry.lines.map(line => `${line.speaker} ${line.text}`)].join(' ').toLocaleLowerCase();
  return query.toLocaleLowerCase().trim().split(/\s+/).every(word => text.includes(word));
}
function validLines(value: unknown): value is Line[] {
  return Array.isArray(value) && value.length <= 80 && value.every(line => line && typeof line.speaker === 'string' && line.speaker.length < 120 && typeof line.text === 'string' && line.text.length < 2000);
}
/** Old saves have only a flat transcript. Preserve it without inventing its context. */
export function restoreJournal(value: Record<string, unknown>): JournalEntry[] | undefined {
  if (!Object.hasOwn(value, 'journal')) {
    if (!validLines(value.transcript)) return;
    return value.transcript.length ? [{ title: 'Earlier conversations', lines: structuredClone(value.transcript) }] : [];
  }
  if (!Array.isArray(value.journal) || value.journal.length > ENTRY_LIMIT) return;
  if (!value.journal.every(entry => entry && typeof entry.title === 'string' && entry.title.length > 0 && entry.title.length < 240
    && (entry.room === undefined || typeof entry.room === 'string' && Object.hasOwn(rooms, entry.room)) && validLines(entry.lines) && entry.lines.length > 0)) return;
  return value.journal.map(entry => ({ title: entry.title, ...(entry.room ? { room: entry.room } : {}), lines: entry.lines.map((line: Line) => ({ speaker: line.speaker, text: line.text })) }));
}
