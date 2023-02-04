const LOCAL_STORAGE_KEY = (name: string) => `file:${name}`;

export function saveScript(name: string, value: string) {
  localStorage.setItem(LOCAL_STORAGE_KEY(name), value);
}

export function deleteScript(name: string) {
  localStorage.removeItem(LOCAL_STORAGE_KEY(name));
}

export function getScript(name: string): string | null {
  return localStorage.getItem(LOCAL_STORAGE_KEY(name));
}
