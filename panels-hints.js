/* Decorate registered panel icons through Slots, never native button DOM. */
export function panelHintLabel(label, id) {
  try {
    const value = typeof label === 'function' ? label() : label;
    return typeof value === 'string' && value.trim() ? value : id;
  } catch { return id; }
}

export function panelHintCandidates(entries, owned) {
  const result = new Map();
  for (const entry of entries) {
    const id = entry.options?.id;
    if (typeof id !== 'string' || !id || owned.has(entry.component)) continue;
    if (!result.has(id)) result.set(id, entry);
  }
  return result;
}

export function installPanelHints(ctx, React) {
  if (typeof ctx.slots.entries !== 'function' || typeof ctx.slots.subscribe !== 'function') return;
  const h = React.createElement;
  ctx.slots.inject('sidebar.panellist', () => {
    const wrapped = new Map();
    const owned = new Set();
    let alive = true, syncing = false;
    function sync() {
      if (!alive || syncing) return;
      syncing = true;
      try {
        const candidates = panelHintCandidates(ctx.slots.entries('sidebar.panellist'), owned);
        for (const [id, current] of wrapped) {
          if (candidates.get(id) !== current.original) {
            current.dispose();
            wrapped.delete(id);
            owned.delete(current.component);
          }
        }
        for (const [id, original] of candidates) {
          if (wrapped.has(id)) continue;
          const hint = {
            getSnapshot: () => panelHintLabel(original.options.label, id),
            subscribe: listener => ctx.locale.subscribe(listener),
          };
          function HintIcon(props) {
            const label = props.useCompactPanelHint(value => value);
            return h('span', { className: 'cs-panel-hint', title: label,
              style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, minHeight: 16 } },
            h(original.component, props));
          }
          const priority = original.priority ?? original.options.priority ?? 0;
          owned.add(HintIcon);
          try {
            const dispose = ctx.slots.register({
              name: 'sidebar.panellist', id, order: original.options.order,
              label: original.options.label, priority: priority - 1,
              children: original.children, store: original.store, locale: original.locale,
              inject: (...args) => {
                const injected = original.inject?.(...args) ?? {};
                return { ...injected, hooks: { ...injected.hooks, compactPanelHint: hint } };
              },
            }, HintIcon);
            wrapped.set(id, { original, component: HintIcon, dispose });
          } catch (error) {
            owned.delete(HintIcon);
            console.error('Compact sidebar panel hint unavailable:', error);
          }
        }
      } finally { syncing = false; }
    }
    const off = ctx.slots.subscribe('sidebar.panellist', sync);
    try { sync(); } catch (error) {
      alive = false;
      off();
      for (const current of wrapped.values()) current.dispose();
      throw error;
    }
    return () => {
      alive = false;
      off();
      for (const current of wrapped.values()) current.dispose();
      wrapped.clear();
      owned.clear();
    };
  });
}
