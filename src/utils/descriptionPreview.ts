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
  // Preserve enough complete sentences to reach 240 characters even when
  // the layout fitter lowers the preferred limit (two or more short sentences).
  const minimumBoundary =
    endings.find((end) => end >= 240) ??
    endings[endings.length - 1] ??
    characters.length;
  const boundary = Math.max(
    endings.filter((end) => end <= maxCharacters).pop() ?? minimumBoundary,
    minimumBoundary
  );
  return {
    preview: characters.slice(0, boundary).join(''),
    continuation: characters.slice(boundary).join('')
  };
}
