/** Removes every `localStorage` key that starts with `prefix`; other keys stay. */
export function removeStoredKeysWithPrefix(prefix: string): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  }
}
