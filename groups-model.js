const MAX_GROUPS = 200;
const MAX_ASSIGNMENTS = 20000;
const MAX_ID_LENGTH = 256;

function fail(message) {
  throw new Error(`Invalid project groups: ${message}`);
}

function object(value, keys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label} must be an object`);
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) fail(`${label} has invalid fields`);
}

function id(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_ID_LENGTH) fail(`${label} must be a nonempty string of at most 256 characters`);
  return value;
}

function name(value) {
  if (typeof value !== 'string') fail('name must be a string');
  const normalized = value.trim();
  if (!normalized || normalized.length > 80) fail('name must contain 1..80 characters after trimming');
  return normalized;
}

function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label} must be boolean`);
  return value;
}

function array(value, limit, label) {
  if (!Array.isArray(value) || value.length > limit) fail(`${label} must be an array of at most ${limit} entries`);
}

// Validation also creates a detached, canonical value. Sets/Maps treat special
// strings such as '__proto__' and 'constructor' exactly like ordinary IDs.
function validate(state) {
  object(state, ['version', 'enabled', 'groups', 'assignments', 'collapsedWorkspaces'], 'state');
  if (state.version !== 1) fail('unsupported version');
  boolean(state.enabled, 'enabled');
  array(state.groups, MAX_GROUPS, 'groups');
  array(state.assignments, MAX_ASSIGNMENTS, 'assignments');
  array(state.collapsedWorkspaces, MAX_ASSIGNMENTS, 'collapsedWorkspaces');
  const ids = new Set();
  const names = new Set();
  const groups = [];
  for (const entry of state.groups) {
    object(entry, ['id', 'name', 'collapsed'], 'group');
    const groupId = id(entry.id, 'group id');
    const groupName = name(entry.name);
    const folded = groupName.toLowerCase();
    if (ids.has(groupId)) fail('duplicate group id');
    if (names.has(folded)) fail('duplicate group name');
    ids.add(groupId);
    names.add(folded);
    groups.push({ id: groupId, name: groupName, collapsed: boolean(entry.collapsed, 'collapsed') });
  }
  const assigned = new Set();
  const assignments = [];
  for (const entry of state.assignments) {
    object(entry, ['workspaceId', 'groupId'], 'assignment');
    const workspaceId = id(entry.workspaceId, 'workspace id');
    const groupId = id(entry.groupId, 'group id');
    if (!ids.has(groupId)) fail('assignment references an unknown group');
    if (assigned.has(workspaceId)) fail('duplicate workspace assignment');
    assigned.add(workspaceId);
    assignments.push({ workspaceId, groupId });
  }
  const collapsedIds = new Set();
  const collapsedWorkspaces = [];
  for (const value of state.collapsedWorkspaces) {
    const workspaceId = id(value, 'collapsed workspace id');
    if (collapsedIds.has(workspaceId)) fail('duplicate collapsed workspace id');
    collapsedIds.add(workspaceId);
    collapsedWorkspaces.push(workspaceId);
  }
  return { version: 1, enabled: state.enabled, groups, assignments, collapsedWorkspaces };
}

/** Return a fresh default state; grouping is opt-in. */
export function groupEmptyState() {
  return { version: 1, enabled: false, groups: [], assignments: [], collapsedWorkspaces: [] };
}

/** Parse persisted JSON; only null means missing. Corrupt/future data throws. */
export function groupParse(raw) {
  if (raw === null) return groupEmptyState();
  if (typeof raw !== 'string') fail('persisted state must be a string or null');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail('persisted state is not valid JSON');
  }
  return validate(parsed);
}

/** Apply one validated action without modifying the input or sharing state objects. */
export function groupReduce(state, action) {
  const next = validate(state);
  if (action === null || typeof action !== 'object' || Array.isArray(action)) fail('action must be an object');
  const keys = {
    create: ['type', 'id', 'name'],
    rename: ['type', 'id', 'name'],
    remove: ['type', 'id'],
    assign: ['type', 'workspaceId', 'groupId'],
    toggle: ['type', 'id'],
    enable: ['type', 'enabled'],
    toggleWorkspace: ['type', 'workspaceId'],
  };
  if (typeof action.type !== 'string' || !Object.hasOwn(keys, action.type)) fail('unknown action type');
  object(action, keys[action.type], 'action');
  const findGroup = groupId => {
    id(groupId, 'group id');
    const group = next.groups.find(entry => entry.id === groupId);
    if (!group) fail('unknown group id');
    return group;
  };
  switch (action.type) {
    case 'create':
      next.groups.push({ id: id(action.id, 'group id'), name: name(action.name), collapsed: false });
      break;
    case 'rename':
      findGroup(action.id).name = name(action.name);
      break;
    case 'remove':
      findGroup(action.id);
      next.groups = next.groups.filter(group => group.id !== action.id);
      next.assignments = next.assignments.filter(entry => entry.groupId !== action.id);
      break;
    case 'assign': {
      const workspaceId = id(action.workspaceId, 'workspace id');
      if (action.groupId !== null) findGroup(action.groupId);
      const index = next.assignments.findIndex(entry => entry.workspaceId === workspaceId);
      if (action.groupId === null) {
        if (index !== -1) next.assignments.splice(index, 1);
      } else if (index !== -1) {
        next.assignments[index] = { workspaceId, groupId: action.groupId };
      } else {
        next.assignments.push({ workspaceId, groupId: action.groupId });
      }
      break;
    }
    case 'toggle': {
      const group = findGroup(action.id);
      group.collapsed = !group.collapsed;
      break;
    }
    case 'enable':
      next.enabled = boolean(action.enabled, 'enabled');
      break;
    case 'toggleWorkspace': {
      const workspaceId = id(action.workspaceId, 'workspace id');
      const index = next.collapsedWorkspaces.indexOf(workspaceId);
      if (index === -1) next.collapsedWorkspaces.push(workspaceId);
      else next.collapsedWorkspaces.splice(index, 1);
      break;
    }
  }
  return validate(next);
}

/** Project saved groups over the available workspace catalog, preserving its objects.
 * enabled is a UI preference; this projection always returns the saved grouping.
 * Missing workspaces retain their assignments in state and reappear on return.
 */
export function groupBuckets(state, workspaces) {
  const checked = validate(state);
  if (!Array.isArray(workspaces)) fail('workspaces must be an array');
  const buckets = checked.groups.map(group => ({ ...group, workspaces: [] }));
  const byGroup = new Map(buckets.map(bucket => [bucket.id, bucket]));
  const assignments = new Map(checked.assignments.map(entry => [entry.workspaceId, entry.groupId]));
  const unassigned = { id: null, name: null, collapsed: false, workspaces: [] };
  const seen = new Set();
  for (const workspace of workspaces) {
    if (workspace === null || typeof workspace !== 'object' || Array.isArray(workspace)) fail('workspace must be an object');
    const workspaceId = id(workspace.workspaceId, 'workspace id');
    if (seen.has(workspaceId)) fail('duplicate workspace id');
    seen.add(workspaceId);
    const bucket = byGroup.get(assignments.get(workspaceId)) ?? unassigned;
    bucket.workspaces.push(workspace);
  }
  return [...buckets, unassigned];
}
