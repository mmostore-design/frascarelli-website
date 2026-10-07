import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped script with isolated DOM/storage fixtures, never browser credentials.
const source = fs.readFileSync(new URL('../js/script.js', import.meta.url), 'utf8');
const supported = ['it', 'pt', 'en', 'es', 'zh', 'ar'];

function render(requested, saved = '', storageUnavailable = false) {
  const listeners = new Map();
  const select = {
    _value: 'it',
    set value(value) { this._value = supported.includes(String(value)) ? String(value) : ''; },
    get value() { return this._value; },
    addEventListener(name, listener) { listeners.set(name, listener); }
  };
  const hero = { dataset: { i18n: 'hero.title' }, textContent: 'La logistica che porta avanti il tuo business.' };
  const classes = { add() {}, remove() {}, toggle() {} };
  const empty = { classList: classes, setAttribute() {}, getAttribute() { return 'false'; }, addEventListener() {}, querySelectorAll() { return []; } };
  const root = {
    _lang: 'it', dir: 'ltr',
    set lang(value) { this._lang = String(value); },
    get lang() { return this._lang; }
  };
  const document = {
    _title: '', documentElement: root, body: { classList: classes },
    set title(value) { this._title = String(value); },
    get title() { return this._title; },
    querySelector(selector) { return selector === '#language-select' ? select : empty; },
    querySelectorAll(selector) { return selector === '[data-i18n]' ? [hero] : []; }
  };
  const events = [];
  let persisted;
  const context = {
    document,
    window: {
      location: { search: '?lang=' + encodeURIComponent(requested), href: 'https://example.invalid/?lang=' + encodeURIComponent(requested), hash: '' },
      scrollY: 0, addEventListener() {}, requestAnimationFrame() { return 1; },
      dispatchEvent(event) { events.push(event.detail.language); }
    },
    localStorage: {
      getItem() { if (storageUnavailable) throw new Error('Unavailable'); return saved; },
      setItem(key, value) { if (storageUnavailable) throw new Error('Unavailable'); persisted = value; }
    },
    history: { replaceState() {} }, URL, URLSearchParams,
    CustomEvent: class { constructor(type, options) { this.detail = options.detail; } },
    IntersectionObserver: class { observe() {} unobserve() {} }
  };
  vm.runInNewContext(source, context, { timeout: 1000 });
  const snapshot = () => ({ selected: select.value, lang: root.lang, dir: root.dir, title: document.title, hero: hero.textContent, event: events.at(-1), persisted });
  return {
    snapshot,
    change(language) { select.value = language; listeners.get('change')(); return snapshot(); },
    setLanguage(language) { context.setLanguage(language, false); return snapshot(); }
  };
}

const valid = Object.fromEntries(supported.map(language => [language, render(language).snapshot()]));
function assertLanguage(actual, language) {
  const expected = valid[language];
  for (const key of ['selected', 'lang', 'dir', 'title', 'hero', 'event']) assert.equal(actual[key], expected[key], key);
  assert.notEqual(actual.title, 'undefined');
  assert.equal(actual.selected, language);
  assert.equal(actual.lang, { pt: 'pt-BR', zh: 'zh-CN' }[language] || language);
  assert.equal(actual.dir, language === 'ar' ? 'rtl' : 'ltr');
}
let cases = 0;
for (const language of supported) {
  assertLanguage(render(language, 'ar').snapshot(), language); cases++;
  assertLanguage(render('', language).snapshot(), language); cases++;
  assertLanguage(render('unsupported', language).snapshot(), language); cases++;
  assertLanguage(render('constructor', language).snapshot(), language); cases++;
}
for (const unsupported of ['', 'unsupported', 'constructor', 'toString', '__proto__', 'hasOwnProperty']) {
  assertLanguage(render(unsupported).snapshot(), 'it'); cases++;
  assertLanguage(render('', unsupported).snapshot(), 'it'); cases++;
  assertLanguage(render(unsupported, 'ar', true).snapshot(), 'it'); cases++;
}
const interactive = render('constructor');
for (const language of supported) { assertLanguage(interactive.change(language), language); cases++; }
for (const value of [null, 42, [], { toString() { throw new Error('Must not coerce unsupported objects'); } }, new String('ar')]) {
  assertLanguage(render('', value).snapshot(), 'it'); cases++;
  assertLanguage(render('ar').setLanguage(value), 'it'); cases++;
}
console.log(`Language fallback: ${cases} shipped-script cases passed; storage isolated, no external requests.`);
