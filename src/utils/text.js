/**
 * Greedy word wrap: packs `words` into lines no wider than `maxW` as
 * `measure(line)` reports it, breaking only between words (a word wider than
 * `maxW` gets a line of its own). Callers choose the split and the measure.
 */
export function wrapWords(words, measure, maxW) {
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
