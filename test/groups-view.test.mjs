import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { groupWorkspaceView, groupSessionView } from '../groups-filter.js';
import { groupCreateStore } from '../groups-store.js';
import { groupNativeViewStore } from '../groups-native-view.js';
import * as model from '../groups-model.js';

const projects = Object.freeze({ phase: 'ready', items: Object.freeze([
  Object.freeze({ workspaceId: 'a', path: 'C:/actual-a', title: 'A', sessionIds: ['s1', 'blank'] }),
  Object.freeze({ workspaceId: 'b', path: 'D:/actual-b', title: 'B', sessionIds: ['s2'] }),
]), archivedSessionIds: ['s2'], pinnedSessionIds: ['s1'] });
const list = Object.freeze({ phase: 'ready', ids: ['s1', 's2', 'orphan', 'blank'],
  byId: Object.freeze({ s1: { id: 's1' }, s2: { id: 's2' }, orphan: { id: 'orphan' }, blank: { id: 'blank', blank: true } }),
  projectionsBySession: { s1: { values: {} }, s2: { values: {} }, orphan: { values: {} } },
});

test('view filtering keeps actual objects, paths, metadata and native ordering intact', () => {
  const ws = groupWorkspaceView(projects, ['a']);
  assert.deepEqual(ws.items.map(x => x.workspaceId), ['a']);
  assert.equal(ws.items[0], projects.items[0]);
  assert.equal(ws.items[0].path, 'C:/actual-a');
  assert.equal(ws.pinnedSessionIds, projects.pinnedSessionIds);
  assert.equal(ws.archivedSessionIds, projects.archivedSessionIds);
  const filtered = groupSessionView(list, projects, ['a'], false);
  assert.deepEqual(filtered.ids, ['s1', 'blank']);
  assert.deepEqual(Object.keys(filtered.byId), ['s1', 'blank']);
  assert.equal(filtered.byId.s1, list.byId.s1);
  assert.equal(filtered.projectionsBySession.s2, undefined);
  assert.equal(filtered.projectionsBySession.s1, list.projectionsBySession.s1);
  assert.equal(list.ids.length, 4);
  assert.equal(projects.items.length, 2);
});

test('unassigned view includes orphan sessions, without leaking other groups into flat/search lists', () => {
  const unassigned = groupSessionView(list, projects, ['b'], true);
  assert.deepEqual(unassigned.ids, ['s2', 'orphan']);
  assert.equal(unassigned.byId.s1, undefined);
  assert.equal(unassigned.byId.blank, undefined);
  assert.deepEqual(groupSessionView(list, projects, [], true).ids, ['orphan']);
  assert.deepEqual(groupSessionView(list, projects, [], false).ids, []);
});

test('filtering rejects incompatible catalogue shapes rather than inventing Host entities', () => {
  assert.throws(() => groupWorkspaceView({}, []), /Incompatible/);
  assert.throws(() => groupSessionView({}, projects, [], true), /Incompatible/);
  assert.throws(() => groupSessionView(list, { items: [{ workspaceId: 'broken' }] }, [], true), /Incompatible/);
  const special = { items: [{ workspaceId: '__proto__', sessionIds: ['__proto__'] }] };
  const input = { ids: ['__proto__'], byId: Object.fromEntries([['__proto__', { id: '__proto__' }]]) };
  assert.equal(groupSessionView(input, special, ['__proto__'], false).byId.__proto__.id, '__proto__');
});

function fixture(raw = null) {
  let data = raw;
  let writeError = false;
  const backend = {
    getItem: () => data,
    setItem: value => { if (writeError) throw new Error('quota'); data = value; },
    removeItem: () => { if (writeError) throw new Error('denied'); data = null; },
  };
  const store = groupCreateStore(model, backend, key => key);
  store.load();
  return { store, raw: () => data, external: value => { data = value; }, failWrites: () => { writeError = true; } };
}
const create = current => model.groupReduce(current, { type: 'create', id: 'g', name: 'Work' });

test('preference changes survive serialization and are published only after successful save', () => {
  const { store, raw, failWrites } = fixture();
  assert.equal(store.update(create), true);
  assert.equal(model.groupParse(raw()).groups[0].name, 'Work');
  const before = store.getSnapshot().state;
  failWrites();
  assert.equal(store.update(state => model.groupReduce(state, { type: 'rename', id: 'g', name: 'Changed' })), false);
  assert.equal(store.getSnapshot().state, before);
  assert.match(store.getSnapshot().error, /quota/);
  assert.equal(model.groupParse(raw()).groups[0].name, 'Work');
  assert.equal(store.reset(), false);
  assert.equal(store.getSnapshot().state, before);
});

test('corrupt/future data is not overwritten by load or a failed action; reset is explicit', () => {
  for (const raw of ['broken json', JSON.stringify({ version: 99 })]) {
    const f = fixture(raw);
    assert.equal(f.store.getSnapshot().state.enabled, false);
    assert.equal(f.store.getSnapshot().error, 'storageError');
    assert.equal(f.store.update(create), false);
    assert.equal(f.raw(), raw);
    assert.equal(f.store.reset(), true);
    assert.equal(f.raw(), null);
    assert.equal(f.store.update(create), true);
  }
});

test('actions read latest preferences and preserve another window’s completed changes', () => {
  const f = fixture();
  f.external(JSON.stringify(create(model.groupEmptyState())));
  assert.equal(f.store.update(state => model.groupReduce(state, { type: 'assign', workspaceId: 'w', groupId: 'g' })), true);
  assert.equal(f.store.getSnapshot().state.groups.length, 1);
  assert.deepEqual(f.store.getSnapshot().state.assignments, [{ workspaceId: 'w', groupId: 'g' }]);
  f.external(null);
  f.store.load();
  assert.equal(f.store.getSnapshot().state.groups.length, 0);
});

test('invalid names leave grouping enabled and disposal prevents later preference writes', () => {
  const f = fixture();
  f.store.update(create);
  f.store.update(state => model.groupReduce(state, { type: 'enable', enabled: true }));
  assert.equal(f.store.update(state => model.groupReduce(state, { type: 'create', id: 'dup', name: 'Work' })), false);
  assert.equal(f.store.getSnapshot().state.enabled, true);
  let events = 0;
  const off = f.store.subscribe(() => events++);
  f.store.edit(true);
  assert.equal(events, 1);
  off();
  const raw = f.raw();
  f.store.dispose();
  assert.equal(f.store.update(create), false);
  f.store.edit(false);
  assert.equal(events, 1);
  assert.equal(f.raw(), raw);
});

test('native housekeeping and manual orders are isolated per custom group', () => {
  const a = groupNativeViewStore();
  const b = groupNativeViewStore();
  const original = { groupExpansion: { outside: true }, sessionOrderByAccount: { outside: ['old'] } };
  const before = JSON.stringify(original);
  a.actions.setGroupExpanded('a', true);
  a.actions.setOrderBy('manual', { a: ['one', 'two'], outside: ['old'] });
  a.actions.retainAccountKeys(['a']);
  a.actions.setSessionOrder('a', ['two', 'one'], { a: ['one', 'two'] });
  a.actions.syncSessionOrders({ a: ['two', 'one', 'three'] });
  assert.deepEqual(a.getSnapshot().sessionOrderByAccount, { a: ['two', 'one', 'three'] });
  assert.deepEqual(b.getSnapshot().sessionOrderByAccount, {});
  assert.equal(JSON.stringify(original), before);
  assert.equal(a.getSnapshot().groupExpansion.a, true);
  a.actions.setArchivedFilter('show');
  a.actions.setGroupBy('workspaceTree');
  assert.equal(a.getSnapshot().archivedFilter, 'show');
  assert.equal(a.getSnapshot().groupBy, 'workspaceTree');
  let events = 0;
  const off = a.subscribe(() => events++);
  a.actions.retainAccountKeys(['a']);
  assert.equal(events, 0);
  off();
});

test('group integration retains the native entry contract and has no file/session mutations', async () => {
  const source = await readFile(new URL('../groups-client.js', import.meta.url), 'utf8');
  assert.match(source, /children: candidate.children, locale: candidate.locale/);
  assert.doesNotMatch(source, /store: candidate.store/);
  assert.match(source, /useStore: useLocalView, actions: nativeView.actions/);
  assert.match(source, /model.groupNativeViewStore\(\)/);
  assert.match(source, /candidate.inject\(\.\.\.args\)/);
  assert.match(source, /useWorkspaces: useFilteredWorkspaces, useSessions: useFilteredSessions/);
  assert.match(source, /ctx.on\('slots\/changed'/);
  assert.match(source, /window.removeEventListener\('storage', onStorage\)/);
  assert.match(source, /store.dispose\(\)/);
  assert.doesNotMatch(source, /document\.|appendChild|innerHTML|MutationObserver|\.rename\(|\.delete\(|\.create\(|\.startSession\(|fetch\(|require\(/);
  assert.doesNotMatch(source, /\.path\s*=/);
  for (const key of ['compatible', 'standard', 'storageError', 'resetConfirm']) assert.ok(source.includes(key));
});
