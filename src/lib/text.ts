export function removeLeadingWhitespace(input: string): string {
  const lines = input.split(/\n/);
  const whitespaceCount = lines[lines.length-1].length - lines[lines.length-1].trimStart().length;
  return lines.map(l => l.startsWith(' ') ? l.slice(whitespaceCount) : l).join('\n');
}
