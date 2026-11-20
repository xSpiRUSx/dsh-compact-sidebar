/** Isolated in-memory viewing preferences for one custom group.
 * Contract adapted to ui-workspace 0.2.2-rc.1. Never writes dsh.workspace.view.v5.
 * Filtering a catalogue must NOT feed housekeeping into the native persisted store.
 */
export function groupNativeViewStore() {
  let value = { groupBy: 'workspace', orderBy: 'updated', archivedFilter: 'default', groupExpansion: {}, sessionOrderByAccount: {} };
  const listeners = new Set();
  const orders = source => Object.fromEntries(Object.entries(source || {}).map(([key, ids]) => [key, [...ids]]));
  const publish = patch => { value = { ...value, ...patch }; for (const listener of [...listeners]) listener(); };
  return {
    getSnapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    actions: {
      setGroupBy(mode) { if (mode !== value.groupBy) publish({ groupBy: mode }); },
      setOrderBy(mode, initialOrders) {
        if (mode !== value.orderBy) publish({ orderBy: mode, sessionOrderByAccount: mode === 'manual' ? orders(initialOrders) : {} });
      },
      setGroupExpanded(key, expanded) {
        if (value.groupExpansion[key] !== expanded) publish({ groupExpansion: { ...value.groupExpansion, [key]: expanded } });
      },
      retainAccountKeys(keys) {
        const retained = new Set(keys);
        const keep = object => Object.fromEntries(Object.entries(object).filter(([key]) => retained.has(key)));
        if (Object.keys(value.groupExpansion).some(key => !retained.has(key)) || Object.keys(value.sessionOrderByAccount).some(key => !retained.has(key))) {
          publish({ groupExpansion: keep(value.groupExpansion), sessionOrderByAccount: keep(value.sessionOrderByAccount) });
        }
      },
      syncSessionOrders(next) {
        if (value.orderBy === 'manual') publish({ sessionOrderByAccount: { ...value.sessionOrderByAccount, ...orders(next) } });
      },
      setSessionOrder(key, ids, initialOrders) {
        publish({ orderBy: 'manual', sessionOrderByAccount: {
          ...(value.orderBy === 'manual' ? value.sessionOrderByAccount : {}), ...orders(initialOrders), [key]: [...ids],
        } });
      },
      setArchivedFilter(filter) { if (filter !== value.archivedFilter) publish({ archivedFilter: filter }); },
    },
  };
}
