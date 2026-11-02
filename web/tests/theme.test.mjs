import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const page = readFileSync(new URL('../src/components/SiteHead.astro', import.meta.url), 'utf8');
const script = page.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

// Exercise the actual early page script with no React runtime present.
function browser({ systemDark = false, saved, storageBlocked = false } = {}) {
  const listeners = new Map();
  const classes = new Set();
  const storage = new Map(saved ? [['expo-theme', saved]] : []);
  const root = { dataset: {}, classList: {
    contains: value => classes.has(value),
    toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
  } };
  const icon = { dataset: { themeIcon: '/favicon-{theme}.svg' }, href: '/favicon.svg',
    getAttribute() { return this.href; }, setAttribute(_name, value) { this.href = value; } };
  const media = { matches: systemDark, addEventListener(_type, handler) { this.changed = handler; } };
  class Element {
    constructor(themeButton = true) { this.themeButton = themeButton; }
    closest() { return this.themeButton ? this : null; }
  }
  const window = {
    addEventListener: (type, handler) => listeners.set('window:' + type, handler),
    dispatchEvent: event => listeners.get('window:' + event.type)?.(event),
  };
  runInNewContext(script, {
    document: { documentElement: root, querySelectorAll: () => [icon],
      addEventListener: (type, handler) => listeners.set(type, handler) },
    window, Element, Event: class { constructor(type) { this.type = type; } },
    matchMedia: () => media,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => {
      if (storageBlocked) throw new Error('Storage unavailable');
      storage.set(key, value);
    } },
  });
  return {
    dark: () => classes.has('dark'), mode: () => root.dataset.theme,
    icon: () => icon.href, saved: () => storage.get('expo-theme'),
    click: (isThemeButton = true) => listeners.get('click')({ target: new Element(isThemeButton) }),
    changeSystem: dark => { media.matches = dark; media.changed(); },
  };
}

test('first click and every later click flip the visible system theme without React', () => {
  for (const systemDark of [false, true]) {
    const app = browser({ systemDark });
    assert.equal(app.dark(), systemDark);
    assert.equal(app.mode(), 'system');
    for (let i = 0; i < 6; i++) {
      const previous = app.dark();
      app.click();
      assert.equal(app.dark(), !previous);
      assert.equal(app.saved(), app.dark() ? 'dark' : 'light');
      assert.equal(app.icon(), `/favicon-${app.saved()}.svg`);
    }
  }
});

test('system changes apply until an explicit choice is made', () => {
  const app = browser();
  app.changeSystem(true);
  assert.equal(app.dark(), true);
  app.click();
  app.changeSystem(false);
  app.changeSystem(true);
  assert.equal(app.dark(), false);
  assert.equal(browser({ saved: app.saved(), systemDark: true }).dark(), false);
});

test('theme switching still works when storage is unavailable', () => {
  const app = browser({ storageBlocked: true });
  app.click();
  assert.equal(app.dark(), true);
  assert.equal(app.icon(), '/favicon-dark.svg');
});

test('unrelated page clicks do not change appearance', () => {
  const app = browser();
  app.click(false);
  assert.equal(app.dark(), false);
  assert.equal(app.mode(), 'system');
});
