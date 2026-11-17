export function descriptionPreview(text: string, maxCharacters = 380) {
  const characters = Array.from(text);
  const endings: number[] = [];
  for (let i = 0; i < characters.length; i++) {
    if (
      /[.!?]/u.test(characters[i]) &&
      (i === characters.length - 1 || /\s/u.test(characters[i + 1]))
    )
      endings.push(i + 1);
  }
  // Keep a complete first sentence even when it exceeds the preferred length.
  // With no sentence ending, show the original text rather than fabricate a cut.
  const boundary =
    endings.filter((end) => end <= maxCharacters).pop() ??
    endings[0] ??
    characters.length;
  return {
    preview: characters.slice(0, boundary).join(''),
    continuation: characters.slice(boundary).join('')
  };
}
