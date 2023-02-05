const LOCAL_STORAGE_KEY = (name: string) => `file:${name}`;
const ANIMATED_LOGO_KEY = 'enable-logo-animation';
const SELECTION_KEY = 'selected-script';

export function saveScript(name: string, value: string) {
  localStorage.setItem(LOCAL_STORAGE_KEY(name), value);
}

export function deleteScript(name: string) {
  localStorage.removeItem(LOCAL_STORAGE_KEY(name));
}

export function getScript(name: string): string | null {
  return localStorage.getItem(LOCAL_STORAGE_KEY(name));
}

export function saveAnimatedLogo(value: boolean) {
  return localStorage.setItem(ANIMATED_LOGO_KEY, JSON.stringify(value));
}
export function getAnimatedLogo(): boolean | null {
  const result = localStorage.getItem(ANIMATED_LOGO_KEY);
  if (result == null) {
    return result;
  } else {
    return JSON.parse(result);
  }
}

export function saveSelected(value: string) {
  return localStorage.setItem(SELECTION_KEY, value);
}
export function getSelected(): string | null {
  return localStorage.getItem(SELECTION_KEY);
}
