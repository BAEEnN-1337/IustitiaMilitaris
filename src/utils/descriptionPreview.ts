const danglingWords = new Set([
  'за',
  'на',
  'в',
  'у',
  'до',
  'від',
  'і',
  'й',
  'та',
  'з',
  'із',
  'зі',
  'по',
  'to',
  'in',
  'at',
  'and',
  'for',
  'of',
  'with',
  'or',
  'a',
  'the',
  'on',
  'from',
  'as',
  'an',
  'by',
  'but'
]);

export function descriptionPreview(text: string) {
  const characters = Array.from(text);
  if (characters.length <= 350) return { preview: text, continuation: '' };
  let boundary = 0;
  for (let i = 219; i < 350; i++) {
    if (/[.!?]/u.test(characters[i]) && /\s/u.test(characters[i + 1]))
      boundary = i + 1;
  }
  if (!boundary) {
    boundary = 320;
    while (boundary > 0 && !/\s/u.test(characters[boundary])) boundary--;
    if (!boundary) {
      boundary = 320;
      while (boundary < characters.length && !/\s/u.test(characters[boundary]))
        boundary++;
    }
    let preview = characters.slice(0, boundary).join('').trimEnd();
    let last = /\S+$/u.exec(preview);
    while (
      last &&
      danglingWords.has(last[0].toLowerCase().replace(/[^\p{L}]+$/u, ''))
    ) {
      preview = preview.slice(0, last.index).trimEnd();
      last = /\S+$/u.exec(preview);
    }
    if (preview) boundary = Array.from(preview).length;
  }
  return {
    preview: characters.slice(0, boundary).join(''),
    continuation: characters.slice(boundary).join('')
  };
}
