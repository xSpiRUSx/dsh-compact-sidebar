/* Source embedded by build-client.mjs. Uses only the public More-menu list slot. */

/** Native unpinned rows already expose open/pin; contribute only the missing unpin actions. */
export function panelPinnedEntries(entries) {
  return Array.isArray(entries) ? entries.filter(entry => entry.pinned === true) : [];
}

/** Dismiss only after the owner's preference operation has completed successfully. */
export async function panelSetPinned(id, pinned, onPinnedChange, onDismiss) {
  const result = await onPinnedChange(id, pinned);
  if (result === false) throw new Error('Panel preference change was not accepted');
  onDismiss();
}
export function panelUnpin(id, onPinnedChange, onDismiss) {
  return panelSetPinned(id, false, onPinnedChange, onDismiss);
}
export function panelActionEntries(entries, nativeMenuAvailable) {
  return nativeMenuAvailable ? panelPinnedEntries(entries) : (Array.isArray(entries) ? entries : []);
}

/** Observable availability: native toolbar pins must stay visible until this becomes true. */
export function installPanelActions(ctx, React) {
  let active = false;
  let alive = true;
  const listeners = new Set();
  const availability = {
    getSnapshot: () => active,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const publish = value => {
    if (active === value) return;
    active = value;
    for (const listener of listeners) listener();
  };
  if (!ctx?.slots?.inject || !ctx.slots.register || !ctx?.locale?.register || !ctx.locale.bind || !ctx.effect) return availability;
  const h = React.createElement;
  const NS = 'local.compact-sidebar.panels';
  const dictionaries = {
    en: { title: 'Pinned panels', manage: 'Sidebar panels', pin: 'Pin', pinPanel: 'Pin {name}', unpin: 'Unpin', unpinPanel: 'Unpin {name}', error: 'Could not change panel pinning. Try again.' },
    ru: { title: 'Закреплённые панели', manage: 'Панели боковой панели', pin: 'Закрепить', pinPanel: 'Закрепить «{name}»', unpin: 'Открепить', unpinPanel: 'Открепить «{name}»', error: 'Не удалось изменить закрепление панели. Попробуйте ещё раз.' },
    zh: { title: '已固定面板', manage: '侧边栏面板', pin: '固定', pinPanel: '固定{name}', unpin: '取消固定', unpinPanel: '取消固定{name}', error: '无法更改面板固定状态，请重试。' },
  };
  const fallbackT = ctx.locale.bind(NS);
  const style = `
    .cs-panel-menu { color:var(--dsw-alias-label-primary); }
    .cs-panel-menu-heading { padding:6px 10px 4px; font-size:12px; color:var(--dsw-alias-label-tertiary); }
    .cs-panel-menu-start { display:block; height:0; }
    .cs-panel-menu-action { display:flex; align-items:center; gap:12px; width:100%; min-height:32px; padding:6px 10px; box-sizing:border-box; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; text-align:start; cursor:pointer; }
    .cs-panel-menu-action:hover, .cs-panel-menu-action:focus-visible { background:var(--dsw-alias-interactive-bg-hover); }
    .cs-panel-menu-action:focus-visible { outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary)); outline-offset:-2px; }
    .cs-panel-menu-action:disabled { color:var(--dsw-alias-label-tertiary); cursor:wait; }
    .cs-panel-menu-name { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .cs-panel-menu-verb { flex:none; color:var(--dsw-alias-label-secondary); font-size:12px; }
    .cs-panel-menu-error { margin:4px 10px; font-size:12px; color:var(--dsw-alias-state-error-primary); }
  `;

  // Current DSH's native contribution provides open/pin for unpinned panels.
  // Detect its live winner, not its raw (possibly abdicated) registration.
  // If absent, add our own pin actions so a hidden panel is never stranded.
  const nativeMenu = {
    getSnapshot: () => {
      if (typeof ctx.slots.entriesOfSlot !== 'function' || typeof ctx.slots.subscribe !== 'function') return false;
      return ctx.slots.entriesOfSlot('sidebar.panellist.actions').some(entry => entry.options.id === 'entry-customization');
    },
    subscribe: listener => typeof ctx.slots.subscribe === 'function'
      ? ctx.slots.subscribe('sidebar.panellist.actions', listener) : () => {},
  };
  function PinnedPanelActions({ entries, onPinnedChange, onDismiss, useCompactNativeMenu, t = fallbackT }) {
    const nativeAvailable = useCompactNativeMenu(value => value);
    const [pending, setPending] = React.useState(null);
    const [error, setError] = React.useState(false);
    const busy = React.useRef(false);
    const mounted = React.useRef(true);
    const headingId = React.useId();
    React.useEffect(() => {
      mounted.current = true;
      return () => { mounted.current = false; };
    }, []);
    const offered = panelActionEntries(entries, nativeAvailable);
    if (!offered.length) return null;
    const unpin = async (event, entry) => {
      // The native menu also delegates clicks. Do not let it dismiss a failed action.
      event.stopPropagation();
      if (busy.current) return;
      busy.current = true;
      setPending(entry.id);
      setError(false);
      try {
        await panelSetPinned(entry.id, !entry.pinned, onPinnedChange, onDismiss);
      } catch {
        if (mounted.current) setError(true);
      } finally {
        busy.current = false;
        if (mounted.current) setPending(null);
      }
    };
    // Match native MenuGroup DOM markers; native keyboard navigation visits enabled buttons.
    return h('section', { className: 'cs-panel-menu', role: 'group', 'aria-labelledby': headingId, 'data-menu-group': '' },
      h('style', null, style),
      h('span', { className: 'cs-panel-menu-start', 'aria-hidden': true, 'data-menu-group-start': '' }),
      h('div', { className: 'cs-panel-menu-heading', id: headingId, 'data-menu-group-heading': '' }, t(nativeAvailable ? 'title' : 'manage')),
      ...offered.map(entry => h('button', {
        key: entry.id, type: 'button', role: 'menuitem', className: 'cs-panel-menu-action',
        title: t(entry.pinned ? 'unpinPanel' : 'pinPanel', { name: entry.label }),
        'aria-label': t(entry.pinned ? 'unpinPanel' : 'pinPanel', { name: entry.label }),
        disabled: pending !== null, 'aria-busy': pending === entry.id || undefined,
        onClick: event => unpin(event, entry),
      }, h('span', { className: 'cs-panel-menu-name' }, entry.label), h('span', { className: 'cs-panel-menu-verb' }, t(entry.pinned ? 'unpin' : 'pin')))),
      error && h('div', { className: 'cs-panel-menu-error', role: 'alert' }, t('error')));
  }

  try {
    ctx.effect(() => () => { alive = false; publish(false); listeners.clear(); });
    ctx.effect(() => ctx.locale.register(NS, dictionaries));
    if (typeof ctx.slots.onEntryError === 'function') {
      ctx.effect(() => ctx.slots.onEntryError((key, registration) => {
        if (key === 'sidebar.panellist.actions' && registration.component === PinnedPanelActions) publish(false);
      }));
    }
    ctx.slots.inject('sidebar.panellist.actions', () => {
      if (!alive) return;
      try {
        const unregister = ctx.slots.register({
          name: 'sidebar.panellist.actions', id: 'compact-sidebar-pinned-panels', order: -10, locale: NS,
          inject: () => ({ hooks: { compactNativeMenu: nativeMenu } }),
        }, PinnedPanelActions);
        publish(true);
        return () => { publish(false); unregister(); };
      } catch {
        publish(false);
      }
    });
  } catch {
    publish(false);
  }
  return availability;
}
