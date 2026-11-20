import test from 'node:test';
import assert from 'node:assert/strict';
import { panelHintLabel, panelHintCandidates, installPanelHints } from '../panels-hints.js';

// These are pure label/lifecycle tests. No React renderer or DOM is emulated.
test('panel hints resolve localized labels and retain exact ids as safe fallbacks', () => {
  let value = 'Плагины';
  assert.equal(panelHintLabel(() => value, 'plugins'), value);
  value = 'Plugins';
  assert.equal(panelHintLabel(() => value, 'plugins'), value);
  for (const label of [undefined, null, '', ' ', 7, () => { throw Error('locale unavailable'); }]) {
    assert.equal(panelHintLabel(label, '__proto__'), '__proto__');
  }
});

test('panel hint candidates skip own decorations and retain the native priority order', () => {
  const own = () => {}, original = () => {}, other = () => {};
  const entries = [
    { options: { id: 'a' }, component: own },
    { options: { id: 'a' }, component: original },
    { options: { id: 'a' }, component: other },
    { options: { id: '__proto__' }, component: other },
    { options: {}, component: original },
  ];
  const result = panelHintCandidates(entries, new Set([own]));
  assert.equal(result.get('a'), entries[1]);
  assert.equal(result.get('__proto__'), entries[3]);
  assert.equal(result.size, 2);
});

test('hint registration preserves native icon metadata, hooks and cleanup without rendering UI', () => {
  let raw = [], changed, dispose, offCount = 0;
  const localeListeners = new Set();
  const originalHook = { getSnapshot: () => 'native' };
  const original = { options: { id: 'panel', order: 7, label: () => 'Panel' }, priority: -3,
    component() {}, children: { native: { kind: 'list' } }, store: {}, locale: 'native',
    inject: token => ({ token, hooks: { originalHook } }),
  };
  raw.push(original);
  const registrations = [];
  const slots = {
    entries: () => raw,
    subscribe(key, fn) { assert.equal(key, 'sidebar.panellist'); changed = fn; return () => { changed = undefined; offCount++; }; },
    inject(key, callback) { assert.equal(key, 'sidebar.panellist'); dispose = callback(); },
    register(options, component) {
      const entry = { options, component };
      raw.push(entry); registrations.push(entry);
      return () => { raw = raw.filter(value => value !== entry); };
    },
  };
  installPanelHints({ slots, locale: { subscribe: fn => { localeListeners.add(fn); return () => localeListeners.delete(fn); } } }, {});
  assert.equal(registrations.length, 1);
  const { options } = registrations[0];
  assert.equal(options.id, 'panel');
  assert.equal(options.label, original.options.label);
  assert.equal(options.order, 7);
  assert.equal(options.priority, -4);
  assert.equal(options.store, original.store);
  assert.equal(options.children, original.children);
  assert.equal(options.locale, original.locale);
  const injected = options.inject('kept');
  assert.equal(injected.token, 'kept');
  assert.equal(injected.hooks.originalHook, originalHook);
  assert.equal(injected.hooks.compactPanelHint.getSnapshot(), 'Panel');
  changed();
  assert.equal(registrations.length, 1, 'own registration does not recursively wrap itself');
  raw = raw.filter(value => value !== original);
  changed();
  assert.equal(raw.length, 0, 'removing a native icon also removes its decoration');
  dispose();
  assert.equal(offCount, 1);
  assert.equal(changed, undefined);
});
