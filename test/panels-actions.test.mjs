import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { panelPinnedEntries, panelActionEntries, panelSetPinned, panelUnpin, installPanelActions } from '../panels-client.js';

const entries = Object.freeze([
  Object.freeze({ id: 'sessions', label: 'Sessions', pinned: true, active: true }),
  Object.freeze({ id: 'plugins', label: 'Plugins', pinned: false, active: false }),
  Object.freeze({ id: 'settings', label: 'Settings', pinned: true, active: false }),
]);

test('only pinned entries supplement native unpinned open/pin rows, preserving objects and order', () => {
  const pinned = panelPinnedEntries(entries);
  assert.deepEqual(pinned.map(entry => entry.id), ['sessions', 'settings']);
  assert.equal(pinned[0], entries[0]);
  assert.equal(pinned[0].active, true);
  assert.equal(pinned[0].label, 'Sessions');
  assert.deepEqual(panelPinnedEntries(undefined), []);
  assert.deepEqual(panelPinnedEntries([]), []);
  assert.equal(entries.length, 3);
});

test('fallback offers pin actions when the stock unpinned menu is absent', async () => {
  assert.equal(panelActionEntries(entries, false), entries);
  assert.deepEqual(panelActionEntries(entries, true).map(entry => entry.id), ['sessions', 'settings']);
  const calls = [];
  await panelSetPinned('plugins', true, (id, pinned) => calls.push([id, pinned]), () => calls.push('dismiss'));
  assert.deepEqual(calls, [['plugins', true], 'dismiss']);
});

test('unpin uses native callback and dismisses after successful completion only', async () => {
  const calls = [];
  let finish;
  const task = panelUnpin('sessions', (id, pinned) => {
    calls.push([id, pinned]);
    return new Promise(resolve => { finish = resolve; });
  }, () => calls.push('dismiss'));
  assert.deepEqual(calls, [['sessions', false]]);
  finish();
  await task;
  assert.deepEqual(calls, [['sessions', false], 'dismiss']);
});

test('throwing, rejected or explicitly refused preferences never dismiss or report success', async () => {
  let dismissals = 0;
  const dismiss = () => { dismissals++; };
  for (const callback of [
    () => { throw new Error('sync denied'); },
    () => Promise.reject(new Error('async denied')),
    () => false,
  ]) {
    await assert.rejects(panelUnpin('sessions', callback, dismiss));
  }
  assert.equal(dismissals, 0);
});

function fixture({ failRegister = false, failInject = false } = {}) {
  const effects = [];
  const registrations = [];
  const dictionaries = [];
  let injection;
  let removed = 0;
  let removedLocale = 0;
  let entryError;
  let nativeEntries = [];
  const registryListeners = new Set();
  const ctx = {
    effect: effect => { effects.push(effect()); },
    locale: {
      bind: () => key => key,
      register: (namespace, values) => {
        dictionaries.push({ namespace, values });
        return () => { removedLocale++; };
      },
    },
    slots: {
      entriesOfSlot: () => nativeEntries,
      subscribe: (key, listener) => { registryListeners.add(listener); return () => registryListeners.delete(listener); },
      onEntryError: callback => { entryError = callback; return () => { entryError = undefined; }; },
      inject: (name, callback) => {
        assert.equal(name, 'sidebar.panellist.actions');
        if (failInject) throw new Error('slot unavailable');
        injection = callback;
      },
      register: (options, component) => {
        if (failRegister) throw new Error('incompatible owner');
        registrations.push({ options, component });
        return () => { removed++; };
      },
    },
  };
  return {
    ctx, registrations, dictionaries,
    activate: () => injection(),
    dispose: () => effects.reverse().forEach(cleanup => cleanup?.()),
    removed: () => removed,
    removedLocale: () => removedLocale,
    crash: (key, registration) => entryError?.(key, registration),
    native: present => { nativeEntries = present ? [{ options: { id: 'entry-customization' } }] : []; for (const fn of registryListeners) fn(); },
  };
}

test('availability becomes true only after registration, and false on slot cleanup', () => {
  const f = fixture();
  const state = installPanelActions(f.ctx, {});
  assert.equal(state.getSnapshot(), false);
  const changes = [];
  const unsubscribe = state.subscribe(() => changes.push(state.getSnapshot()));
  const cleanup = f.activate();
  assert.equal(state.getSnapshot(), true);
  assert.equal(f.registrations.length, 1);
  const { inject, ...metadata } = f.registrations[0].options;
  assert.equal(typeof inject, 'function');
  assert.deepEqual(metadata, {
    name: 'sidebar.panellist.actions', id: 'compact-sidebar-pinned-panels', order: -10,
    locale: 'local.compact-sidebar.panels',
  });
  cleanup();
  assert.equal(state.getSnapshot(), false);
  assert.deepEqual(changes, [true, false]);
  assert.equal(f.removed(), 1);
  unsubscribe();
  f.dispose();
  assert.equal(f.removedLocale(), 1);
  assert.equal(f.activate(), undefined);
});

test('stock menu unload or abdication immediately enables fallback repinning', () => {
  const f = fixture();
  installPanelActions(f.ctx, {});
  f.activate();
  const source = f.registrations[0].options.inject().hooks.compactNativeMenu;
  const updates = [];
  const off = source.subscribe(() => updates.push(source.getSnapshot()));
  assert.equal(source.getSnapshot(), false);
  f.native(true);
  assert.equal(source.getSnapshot(), true);
  f.native(false); // entriesOfSlot omits unloaded and abdicated native entries.
  assert.equal(source.getSnapshot(), false);
  assert.equal(panelActionEntries(entries, source.getSnapshot()), entries);
  assert.deepEqual(updates, [true, false]);
  off();
  f.dispose();
});

test('a menu component crash restores native pin affordances', () => {
  const f = fixture();
  const state = installPanelActions(f.ctx, {});
  f.activate();
  f.crash('other.slot', f.registrations[0]);
  assert.equal(state.getSnapshot(), true);
  f.crash('sidebar.panellist.actions', { component() {} });
  assert.equal(state.getSnapshot(), true);
  f.crash('sidebar.panellist.actions', f.registrations[0]);
  assert.equal(state.getSnapshot(), false);
  f.dispose();
});

test('unavailable or failing slot retains native pin affordances', () => {
  assert.equal(installPanelActions({}, {}).getSnapshot(), false);
  for (const options of [{ failInject: true }, { failRegister: true }]) {
    const f = fixture(options);
    const state = installPanelActions(f.ctx, {});
    if (!options.failInject) f.activate();
    assert.equal(state.getSnapshot(), false);
    f.dispose();
  }
});

test('plugin disposal publishes unavailable and releases localized dictionaries', () => {
  const f = fixture();
  const state = installPanelActions(f.ctx, {});
  f.activate();
  const changes = [];
  state.subscribe(() => changes.push(state.getSnapshot()));
  f.dispose();
  assert.equal(state.getSnapshot(), false);
  assert.deepEqual(changes, [false]);
  assert.equal(f.removedLocale(), 1);
  for (const locale of ['en', 'ru', 'zh']) {
    const dictionary = f.dictionaries[0].values[locale];
    for (const key of ['title', 'unpin', 'unpinPanel', 'error']) assert.ok(dictionary[key]);
    assert.match(dictionary.unpinPanel, /\{name\}/);
  }
});

test('source uses native menu semantics, scoped theme CSS, error affordance, and no replacement navigation', async () => {
  const source = await readFile(new URL('../panels-client.js', import.meta.url), 'utf8');
  assert.match(source, /role: 'menuitem'/);
  for (const marker of ['data-menu-group', 'data-menu-group-start', 'data-menu-group-heading']) {
    assert.ok(source.includes(`'${marker}': ''`));
  }
  assert.match(source, /'aria-labelledby': headingId/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /await panelSetPinned\(entry.id, !entry.pinned, onPinnedChange, onDismiss\)/);
  assert.match(source, /catch \{\s*if \(mounted.current\) setError\(true\)/);
  assert.match(source, /role: 'alert'/);
  assert.match(source, /h\('style', null, style\)/);
  const css = source.match(/const style = `([\s\S]*?)`;/)[1];
  for (const selector of css.matchAll(/(?:^|\n)\s*([^{}]+)\{/g)) {
    for (const part of selector[1].split(',')) assert.match(part.trim(), /^\.cs-panel/);
  }
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b|rgba?\(/i);
  assert.doesNotMatch(source, /\bimport\s|localStorage|sessionStorage|document\.|window\.|querySelector|MutationObserver|onOpen\s*\(/);
  assert.doesNotMatch(source, /sidebar\.workspaces|enabled\s*:|\.entries\(/);
  assert.match(source, /entriesOfSlot\('sidebar.panellist.actions'\)/);
  assert.match(source, /compactNativeMenu: nativeMenu/);
});
