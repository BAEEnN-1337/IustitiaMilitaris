export function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
export function parseImportedJson(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('Unsafe JSON key');
    return key === 'posylannia' ? safeExternalUrl(value) || '' : value;
  });
}
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' })[char]!);
}
