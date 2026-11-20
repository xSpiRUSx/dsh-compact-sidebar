import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../groups-model.js';

const { groupEmptyState, groupParse, groupReduce, groupBuckets } = model;
const saved = state => JSON.stringify(state);
const parse = state => groupParse(saved(state));
const create = (state, id = 'work', name = 'Work') => groupReduce(state, { type: 'create', id, name });
const assign = (state, workspaceId, groupId) => groupReduce(state, { type: 'assign', workspaceId, groupId });
function frozen(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}

test('only pure group-prefixed functions are exported', () => {
  assert.deepEqual(Object.keys(model).sort(), ['groupBuckets', 'groupEmptyState', 'groupParse', 'groupReduce']);
  for (const [key, value] of Object.entries(model)) {
    assert.ok(key.startsWith('group'));
    assert.equal(typeof value, 'function');
  }
});

test('fresh empty default; null means absent, not invalid JSON', () => {
  const empty = groupEmptyState();
  assert.deepEqual(empty, { version: 1, enabled: false, groups: [], assignments: [], collapsedWorkspaces: [] });
  assert.deepEqual(groupParse(null), empty);
  const another = groupEmptyState();
  assert.notEqual(another, empty);
  assert.notEqual(another.groups, empty.groups);
  empty.groups.push({ id: 'x' });
  assert.deepEqual(another.groups, []);
});

test('create, rename, move, unassign, collapse and enable roundtrip', () => {
  let state = create(groupEmptyState(), 'work', '  Work  ');
  state = create(state, 'personal', 'Personal');
  assert.equal(state.groups[0].name, 'Work');
  state = groupReduce(state, { type: 'rename', id: 'personal', name: '  Home  ' });
  state = assign(state, 'one', 'work');
  state = assign(state, 'two', 'work');
  state = assign(state, 'one', 'personal');
  assert.deepEqual(state.assignments, [{ workspaceId: 'one', groupId: 'personal' }, { workspaceId: 'two', groupId: 'work' }]);
  state = assign(state, 'two', null);
  state = groupReduce(state, { type: 'toggle', id: 'personal' });
  state = groupReduce(state, { type: 'enable', enabled: true });
  state = groupReduce(state, { type: 'toggleWorkspace', workspaceId: 'one' });
  assert.deepEqual(parse(state), state);
  assert.equal(state.groups[1].name, 'Home');
  assert.equal(state.groups[1].collapsed, true);
  assert.equal(state.enabled, true);
  assert.deepEqual(state.collapsedWorkspaces, ['one']);
  state = groupReduce(state, { type: 'toggle', id: 'personal' });
  state = groupReduce(state, { type: 'toggleWorkspace', workspaceId: 'one' });
  assert.equal(state.groups[1].collapsed, false);
  assert.deepEqual(state.collapsedWorkspaces, []);
});

test('buckets preserve empty groups, saved order, catalog order and original objects', () => {
  let state = create(create(groupEmptyState(), 'b', 'Second'), 'a', 'First');
  state = assign(assign(state, 'w1', 'a'), 'w2', 'a');
  state = groupReduce(state, { type: 'toggle', id: 'a' });
  const catalog = frozen([{ workspaceId: 'w2', title: 'Two' }, { workspaceId: 'w3' }, { workspaceId: 'w1' }]);
  const buckets = groupBuckets(frozen(state), catalog);
  assert.deepEqual(buckets.map(({ id, name, collapsed }) => ({ id, name, collapsed })), [
    { id: 'b', name: 'Second', collapsed: false },
    { id: 'a', name: 'First', collapsed: true },
    { id: null, name: null, collapsed: false },
  ]);
  assert.deepEqual(buckets[0].workspaces, []);
  assert.deepEqual(buckets[1].workspaces, [catalog[0], catalog[2]]);
  assert.equal(buckets[1].workspaces[0], catalog[0]);
  assert.equal(buckets[2].workspaces[0], catalog[1]);
  assert.equal(buckets.flatMap(bucket => bucket.workspaces).length, catalog.length);
  assert.deepEqual(groupBuckets(groupEmptyState(), []), [{ id: null, name: null, collapsed: false, workspaces: [] }]);
});

test('removing a group unassigns its projects without losing catalog or collapse state', () => {
  let state = assign(assign(create(create(groupEmptyState(), 'a', 'A'), 'b', 'B'), 'one', 'a'), 'two', 'b');
  state = groupReduce(state, { type: 'toggleWorkspace', workspaceId: 'one' });
  const old = frozen(state);
  const result = groupReduce(old, { type: 'remove', id: 'a' });
  assert.deepEqual(result.groups.map(group => group.id), ['b']);
  assert.deepEqual(result.assignments, [{ workspaceId: 'two', groupId: 'b' }]);
  assert.deepEqual(result.collapsedWorkspaces, ['one']);
  const catalog = [{ workspaceId: 'one' }, { workspaceId: 'two' }];
  assert.deepEqual(groupBuckets(result, catalog).map(bucket => bucket.workspaces), [[catalog[1]], [catalog[0]]]);
  assert.equal(old.assignments.length, 2);
});

test('temporarily absent workspaces keep assignments and restore after persistence', () => {
  let state = assign(create(groupEmptyState()), 'offline', 'work');
  state = groupReduce(state, { type: 'toggleWorkspace', workspaceId: 'offline' });
  assert.deepEqual(groupBuckets(state, [])[0].workspaces, []);
  state = parse(state);
  const restored = { workspaceId: 'offline', arbitrary: { value: 1 } };
  assert.equal(groupBuckets(state, [restored])[0].workspaces[0], restored);
  assert.deepEqual(state.collapsedWorkspaces, ['offline']);
  assert.equal(state.assignments.length, 1);
});

test('reducers and projections never mutate and detach all state-owned objects', () => {
  const state = frozen(assign(create(groupEmptyState()), 'one', 'work'));
  const before = saved(state);
  for (const action of [
    { type: 'create', id: 'two', name: 'Two' },
    { type: 'rename', id: 'work', name: 'Renamed' },
    { type: 'remove', id: 'work' },
    { type: 'assign', workspaceId: 'one', groupId: null },
    { type: 'assign', workspaceId: 'one', groupId: 'work' },
    { type: 'toggle', id: 'work' },
    { type: 'enable', enabled: false },
    { type: 'toggleWorkspace', workspaceId: 'one' },
  ]) {
    const next = groupReduce(state, frozen(action));
    assert.notEqual(next, state);
    for (const key of ['groups', 'assignments', 'collapsedWorkspaces']) assert.notEqual(next[key], state[key]);
    if (next.groups.length) assert.notEqual(next.groups[0], state.groups[0]);
    if (next.assignments.length) assert.notEqual(next.assignments[0], state.assignments[0]);
    assert.equal(saved(state), before);
  }
  const first = groupBuckets(state, [{ workspaceId: 'one' }]);
  const second = groupBuckets(state, []);
  first[0].name = 'Changed';
  first[0].workspaces.length = 0;
  assert.equal(second[0].name, 'Work');
  assert.equal(saved(state), before);
});

test('special IDs and names are ordinary values, never prototype keys', () => {
  let state = create(create(groupEmptyState(), '__proto__', '__proto__'), 'constructor', 'constructor');
  state = assign(assign(state, '__proto__', 'constructor'), 'toString', '__proto__');
  state = groupReduce(state, { type: 'toggleWorkspace', workspaceId: '__proto__' });
  const buckets = groupBuckets(parse(state), [{ workspaceId: '__proto__' }, { workspaceId: 'toString' }]);
  assert.equal(buckets[0].workspaces[0].workspaceId, 'toString');
  assert.equal(buckets[1].workspaces[0].workspaceId, '__proto__');
  assert.equal({}.polluted, undefined);
  assert.throws(() => groupReduce(state, { type: '__proto__' }), Error);
});

test('names trim, reject empty/long values and are unique case-insensitively', () => {
  const state = create(groupEmptyState(), 'a', 'Alpha');
  for (const invalid of ['', '  ', 'x'.repeat(81), 5, null, {}, true]) {
    assert.throws(() => create(state, 'b', invalid), Error);
    assert.throws(() => groupReduce(state, { type: 'rename', id: 'a', name: invalid }), Error);
  }
  assert.throws(() => create(state, 'b', ' ALPHA '), Error);
  const other = create(state, 'b', 'Beta');
  assert.throws(() => groupReduce(other, { type: 'rename', id: 'b', name: 'alpha' }), Error);
  assert.equal(groupReduce(state, { type: 'rename', id: 'a', name: ' ALPHA ' }).groups[0].name, 'ALPHA');
  assert.equal(create(state, 'b', 'x'.repeat(80)).groups[1].name.length, 80);
  assert.throws(() => parse({ ...other, groups: [other.groups[0], { ...other.groups[1], name: 'alpha' }] }), Error);
});

test('IDs are bounded nonblank strings, and duplicate group IDs are rejected', () => {
  const state = create(groupEmptyState());
  for (const value of ['', '   ', 'x'.repeat(257), 1, null, {}, []]) {
    assert.throws(() => create(state, value, 'Another'), Error);
    assert.throws(() => assign(state, value, 'work'), Error);
    assert.throws(() => groupReduce(state, { type: 'toggleWorkspace', workspaceId: value }), Error);
  }
  assert.equal(create(state, 'x'.repeat(256), 'Long ID').groups[1].id.length, 256);
  assert.throws(() => create(state, 'work', 'Other'), Error);
});

test('malformed, missing, corrupted and future data throws rather than silently resetting', () => {
  for (const raw of ['', ' ', '{', 'null', '[]', 'true', '42', '{}', undefined, 0, {}]) {
    assert.throws(() => groupParse(raw), Error);
  }
  for (const version of [0, 2, '1', null, true]) assert.throws(() => parse({ ...groupEmptyState(), version }), Error);
  for (const [key, value] of [
    ['enabled', 'true'], ['groups', {}], ['assignments', null], ['collapsedWorkspaces', 'x'],
  ]) assert.throws(() => parse({ ...groupEmptyState(), [key]: value }), Error);
  assert.throws(() => parse({ ...groupEmptyState(), extra: true }), Error);
  assert.throws(() => groupParse('{"version":1,"enabled":false,"groups":[],"assignments":[],"collapsedWorkspaces":[],"__proto__":{}}'), Error);
});

test('strict nested records reject unknown groups, duplicate assignments and bad flags', () => {
  const state = create(groupEmptyState());
  const assignment = { workspaceId: 'one', groupId: 'work' };
  const invalid = [
    { ...state, groups: [state.groups[0], { ...state.groups[0], name: 'Other' }] },
    { ...state, groups: [{ ...state.groups[0], collapsed: 1 }] },
    { ...state, groups: [{ ...state.groups[0], extra: true }] },
    { ...state, groups: [null] },
    { ...state, assignments: [{ ...assignment, groupId: 'deleted' }] },
    { ...state, assignments: [{ ...assignment, groupId: null }] },
    { ...state, assignments: [assignment, assignment] },
    { ...state, assignments: [{ ...assignment, extra: true }] },
    { ...state, assignments: [null] },
    { ...state, collapsedWorkspaces: ['one', 'one'] },
    { ...state, collapsedWorkspaces: [4] },
  ];
  for (const value of invalid) assert.throws(() => parse(value), Error);
});

test('invalid action types, fields and unknown targets throw without mutation', () => {
  const state = frozen(create(groupEmptyState()));
  const before = saved(state);
  for (const action of [
    null, [], 'create', {}, { type: 'unknown' },
    { type: 'create', id: 'b' }, { type: 'enable', enabled: 1 },
    { type: 'enable', enabled: true, extra: 'bad' },
    { type: 'assign', workspaceId: 'one' },
    { type: 'assign', workspaceId: 'one', groupId: 'missing' },
    { type: 'assign', workspaceId: 'one', groupId: false },
    { type: 'rename', id: 'missing', name: 'Name' },
    { type: 'remove', id: 'missing' }, { type: 'toggle', id: 'missing' },
  ]) {
    assert.throws(() => groupReduce(state, action), Error);
    assert.equal(saved(state), before);
  }
  assert.throws(() => groupReduce({ ...state, enabled: 1 }, { type: 'enable', enabled: true }), Error);
});

test('limits accept boundaries and reject excess groups and assignments', () => {
  const state = groupEmptyState();
  state.groups = Array.from({ length: 200 }, (_, i) => ({ id: `g${i}`, name: `Group ${i}`, collapsed: false }));
  state.assignments = Array.from({ length: 20000 }, (_, i) => ({ workspaceId: `w${i}`, groupId: 'g0' }));
  state.collapsedWorkspaces = state.assignments.map(entry => entry.workspaceId);
  assert.deepEqual(parse(state), state);
  assert.throws(() => create(state, 'overflow', 'Overflow'), Error);
  assert.throws(() => assign(state, 'overflow', 'g0'), Error);
  assert.equal(assign(state, 'w0', 'g1').assignments.length, 20000);
  assert.equal(assign(state, 'w0', null).assignments.length, 19999);
  assert.throws(() => groupReduce(state, { type: 'toggleWorkspace', workspaceId: 'overflow' }), Error);
  assert.equal(groupReduce(state, { type: 'toggleWorkspace', workspaceId: 'w0' }).collapsedWorkspaces.length, 19999);
  assert.throws(() => parse({ ...state, groups: [...state.groups, { id: 'overflow', name: 'Overflow', collapsed: false }] }), Error);
  assert.throws(() => parse({ ...state, assignments: [...state.assignments, { workspaceId: 'overflow', groupId: 'g0' }] }), Error);
});

test('bucket input validation rejects duplicate catalog IDs and malformed catalogs', () => {
  const state = groupEmptyState();
  for (const catalog of [null, {}, [{ workspaceId: '' }], [null], [[]], [{ workspaceId: 2 }], [{ workspaceId: 'same' }, { workspaceId: 'same' }]]) {
    assert.throws(() => groupBuckets(state, catalog), Error);
  }
  assert.throws(() => groupBuckets({ ...state, version: 2 }, []), Error);
});
