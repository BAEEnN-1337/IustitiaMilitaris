export function descriptionPreview(text: string, limit = 190) {
  const characters = Array.from(text);
  if (characters.length <= limit) return { preview: text, continuation: '' };
  let boundary = limit;
  if (!/\s/u.test(characters[boundary])) {
    while (boundary > 0 && !/\s/u.test(characters[boundary])) boundary--;
    if (boundary === 0) {
      boundary = limit;
      while (boundary < characters.length && !/\s/u.test(characters[boundary]))
        boundary++;
    }
  }
  return {
    preview: characters.slice(0, boundary).join(''),
    continuation: characters.slice(boundary).join('')
  };
}
