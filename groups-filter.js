/** Pure, non-mutating view projections. Real workspace IDs and paths stay intact. */
export function groupWorkspaceView(snapshot, ids) {
  if (!snapshot || !Array.isArray(snapshot.items)) throw new Error('Incompatible WorkspaceSnapshot');
  const allowed = new Set(ids);
  return { ...snapshot, items: snapshot.items.filter(item => allowed.has(item.workspaceId)) };
}

export function groupSessionView(list, workspaces, ids, includeOrphans) {
  if (!list || !Array.isArray(list.ids) || !list.byId || !Array.isArray(workspaces?.items)) {
    throw new Error('Incompatible SessionListState');
  }
  const selected = new Set(ids);
  const allMembers = new Set();
  const visibleMembers = new Set();
  for (const workspace of workspaces.items) {
    if (!Array.isArray(workspace.sessionIds)) throw new Error('Incompatible WorkspaceView');
    for (const id of workspace.sessionIds) {
      allMembers.add(id);
      if (selected.has(workspace.workspaceId)) visibleMembers.add(id);
    }
  }
  const visible = id => visibleMembers.has(id) || (includeOrphans && !allMembers.has(id));
  const filtered = {
    ...list,
    ids: list.ids.filter(visible),
    byId: Object.fromEntries(Object.entries(list.byId).filter(([id]) => visible(id))),
  };
  if (list.projectionsBySession) {
    filtered.projectionsBySession = Object.fromEntries(
      Object.entries(list.projectionsBySession).filter(([id]) => visible(id)),
    );
  }
  return filtered;
}
