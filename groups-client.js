/* Source embedded by build-client.mjs. No imports of private Harness modules. */
export function installWorkspaceGroups(ctx, React, model) {
  const h = React.createElement;
  const NS = 'local.compact-sidebar.groups';
  const KEY = 'dsh.local.compact-sidebar.project-groups.v1';
  const dictionaries = {
    en: {
      title: 'My groups', manage: 'Manage project groups', standard: 'Standard list',
      enable: 'Use my groups', name: 'Group name', create: 'Create group',
      rename: 'Rename', remove: 'Delete group', confirm: 'Confirm deletion', cancel: 'Cancel',
      none: 'No group', empty: 'This group is empty. Assign projects in group settings.',
      projects: 'Project assignments', group: 'Group', close: 'Close', saveError: 'Cannot save group settings.',
      icon: 'Project icon', folder: 'Default folder', iconError: 'Cannot save the project icon.',
      blue: 'Blue', green: 'Green', purple: 'Purple', orange: 'Orange', teal: 'Teal',
      storageError: 'Group settings could not be read. Existing data has not been overwritten.',
      reset: 'Reset group settings', resetConfirm: 'Delete only saved grouping settings?',
      note: 'Groups are saved in this browser. Folders and sessions are never moved or deleted.',
      fallback: 'Grouping is unavailable for this version of the workspace browser.',
      menuHint: 'Expand one group to browse its projects. Native search works inside that group.',
      collapse: 'Collapse group', expand: 'Expand group', loading: 'Loading workspaces…',
    },
    ru: {
      title: 'Мои группы', manage: 'Настроить группы проектов', standard: 'Стандартный список',
      enable: 'Использовать мои группы', name: 'Название группы', create: 'Создать группу',
      rename: 'Переименовать', remove: 'Удалить группу', confirm: 'Подтвердить удаление', cancel: 'Отмена',
      none: 'Без группы', empty: 'Группа пуста. Распределите проекты в настройках групп.',
      projects: 'Распределение проектов', group: 'Группа', close: 'Закрыть', saveError: 'Не удалось сохранить настройки групп.',
      icon: 'Иконка проекта', folder: 'Обычная папка', iconError: 'Не удалось сохранить иконку проекта.',
      blue: 'Синий', green: 'Зелёный', purple: 'Фиолетовый', orange: 'Оранжевый', teal: 'Бирюзовый',
      storageError: 'Не удалось прочитать настройки групп. Сохранённые данные не перезаписаны.',
      reset: 'Сбросить настройки групп', resetConfirm: 'Удалить только сохранённое распределение по группам?',
      note: 'Группы сохраняются в этом браузере. Папки и сессии не перемещаются и не удаляются.',
      fallback: 'Группировка недоступна для этой версии списка проектов.',
      menuHint: 'Раскройте группу для просмотра проектов. Штатный поиск работает внутри этой группы.',
      collapse: 'Свернуть группу', expand: 'Раскрыть группу', loading: 'Загрузка проектов…',
    },
  };
  for (const language of ['en', 'ru', 'zh']) {
    ctx.effect(() => ctx.locale.register(NS, language, dictionaries[language] || dictionaries.en));
  }
  const t = ctx.locale.bind(NS);
  const store = model.groupCreateStore(model, {
    getItem: () => window.localStorage.getItem(KEY),
    setItem: value => window.localStorage.setItem(KEY, value),
    removeItem: () => window.localStorage.removeItem(KEY),
  }, t);
  store.load();
  ctx.effect(() => {
    const onStorage = event => { if (event.key === KEY || event.key === null) store.load(); };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('storage', onStorage); store.dispose(); };
  });
  const collapseOthers = (state, except) => {
    let result = state;
    for (const group of state.groups) {
      if (group.id !== except && !group.collapsed) result = model.groupReduce(result, { type: 'toggle', id: group.id });
    }
    return result;
  };
  const style = `
    .cs-groups { display:flex; flex-direction:column; height:100%; min-height:0; color:var(--dsw-alias-label-primary); }
    .cs-groups-top { display:flex; align-items:center; gap:4px; padding:4px 6px; flex:none; }
    .cs-groups-top strong { flex:1; font-size:13px; }
    .cs-groups button, .cs-group-editor button { font:inherit; color:inherit; cursor:pointer; }
    .cs-group-tool, .cs-group-launch > button { border:0; background:transparent; color:var(--dsw-alias-label-secondary); border-radius:6px; padding:6px; }
    .cs-group-tool:hover, .cs-group-head:hover, .cs-group-launch > button:hover, .cs-group-launch > button[aria-expanded="true"] { background:var(--dsw-specific-sidebar-nav-item-active); }
    .cs-group-section { display:flex; flex-direction:column; flex:none; min-height:0; }
    .cs-group-section[data-open="true"] { flex:1; }
    .cs-group-head { display:flex; align-items:center; gap:6px; width:100%; min-height:30px; padding:4px 8px; border:0; background:transparent; text-align:left; }
    .cs-group-head span:nth-child(2) { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cs-group-count { color:var(--dsw-alias-label-tertiary); font-size:11px; }
    .cs-group-native { display:flex; flex-direction:column; flex:1; min-height:100px; }
    .cs-group-empty { margin:8px; font-size:12px; color:var(--dsw-alias-label-secondary); }
    .cs-group-launch { position:relative; color:var(--dsw-alias-label-primary); }
    .cs-group-launch > button { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; }
    .cs-group-editor { position:absolute; bottom:calc(100% + 6px); left:4px; z-index:80; width:min(324px, calc(100vw - 32px)); max-height:min(65vh, 550px); overflow:auto; overscroll-behavior:contain; box-sizing:border-box; padding:0 12px 12px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font:inherit; font-size:13px; text-align:start; }
    .cs-group-editor header, .cs-group-editor form, .cs-group-edit-row { display:flex; gap:6px; align-items:center; margin-bottom:6px; }
    .cs-group-editor header { position:sticky; top:0; z-index:1; margin:0 -12px 10px; padding:8px 12px; background:var(--dsw-alias-bg-layer-1); border-bottom:1px solid var(--dsw-alias-border-l1); }
    .cs-group-editor header strong { flex:1; }
    .cs-group-editor input:not([type="checkbox"]), .cs-group-editor select { min-width:0; width:100%; box-sizing:border-box; font:inherit; padding:5px 6px; border:1px solid var(--dsw-alias-border-l2); border-radius:6px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); }
    .cs-group-editor input { flex:1; }
    .cs-group-editor button { flex:none; min-height:28px; padding:4px 8px; border:0; border-radius:6px; background:transparent; }
    .cs-group-editor button:hover { background:var(--dsw-alias-bg-layer-2); }
    .cs-group-editor .cs-group-create { background:var(--dsw-alias-button-info-fill); }
    .cs-group-editor .cs-group-create:hover { background:var(--dsw-alias-button-info-hover); }
    .cs-group-projects { margin:14px 0 8px; font-size:13px; }
    .cs-group-assignment { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(110px,100%),1fr)); gap:4px 8px; padding:8px 0; border-top:1px solid var(--dsw-alias-border-l1); }
    .cs-group-assignment span { grid-column:1/-1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .cs-group-assignment label { min-width:0; font-size:12px; color:var(--dsw-alias-label-secondary); }
    .cs-group-assignment select { display:block; margin-top:3px; }
    .cs-group-editor p { font-size:12px; color:var(--dsw-alias-label-secondary); }
    .cs-group-editor [role="alert"], .cs-groups [role="alert"] { color:var(--dsw-alias-state-error-primary); padding:6px; }
    .cs-groups { overflow:auto; }
    .cs-group-editor :focus-visible, .cs-groups :focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:1px; }
  `;
  function GroupIcon() {
    return h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
      h('path', { d: 'M3 5h6l2 2h10v6H3zM3 16h7m-7 4h7m5-4h6m-6 4h6' }));
  }
  function EditGroup({ group }) {
    const [name, setName] = React.useState(group.name);
    const [confirm, setConfirm] = React.useState(false);
    React.useEffect(() => setName(group.name), [group.name]);
    return h('div', null,
      h('form', { onSubmit: event => {
        event.preventDefault();
        store.update(state => model.groupReduce(state, { type: 'rename', id: group.id, name }));
      } },
      h('input', { value: name, maxLength: 80, required: true, 'aria-label': t('name'), onChange: event => setName(event.target.value) }),
      h('button', { type: 'submit', title: t('rename'), 'aria-label': `${t('rename')}: ${group.name}` }, '✓'),
      h('button', { type: 'button', title: t('remove'), 'aria-label': `${t('remove')}: ${group.name}`, onClick: () => setConfirm(!confirm) }, '×')),
      confirm && h('div', { className: 'cs-group-edit-row' },
        h('button', { type: 'button', onClick: () => store.update(state => model.groupReduce(state, { type: 'remove', id: group.id })) }, t('confirm')),
        h('button', { type: 'button', onClick: () => setConfirm(false) }, t('cancel'))));
  }
  const palette = new Map(Object.entries({ blue: '#385cb2', green: '#237449', purple: '#7150aa', orange: '#a35224', teal: '#107574' }));
  const iconPrefix = 'dsh.local.compact-sidebar.project-icon.v1:';
  function Footer(props) {
    const stateView = props.useCompactGroups(value => value);
    const workspaceView = props.useWorkspaces(value => value);
    const [revision, refreshIcons] = React.useReducer(value => value + 1, 0);
    const [iconError, setIconError] = React.useState(false);
    React.useEffect(() => {
      const reload = event => { if (event.key === null || event.key.startsWith(iconPrefix)) refreshIcons(); };
      window.addEventListener('storage', reload);
      return () => window.removeEventListener('storage', reload);
    }, []);
    const icons = React.useMemo(() => {
      const colors = new Map();
      const rules = [];
      for (const ws of workspaceView?.items || []) {
        let color;
        try { color = window.localStorage.getItem(iconPrefix + ws.workspaceId); } catch { continue; }
        if (!palette.has(color)) continue;
        colors.set(ws.workspaceId, color);
        const label = (ws.title || ws.path?.split(/[\\/]/).filter(Boolean).pop() || '?').trim();
        const initial = Array.from(label.toLocaleUpperCase())[0] || '?';
        const folder = `[role="treeitem"][data-row-key="workspace:${CSS.escape(ws.workspaceId)}"] > span:first-child`;
        // Keep the native folder cell and its hover-to-chevron behavior.
        rules.push(`${folder} > svg { display:none; } ${folder}::before { content:"${CSS.escape(initial)}"; display:grid; place-items:center; width:16px; height:16px; border-radius:4px; font:bold 11px/1 system-ui; background:${palette.get(color)}; color:white; }`);
      }
      return { colors, css: rules.join('\n') };
    }, [workspaceView?.items, revision]);
    function selectIcon(id, color) {
      try {
        if (palette.has(color)) window.localStorage.setItem(iconPrefix + id, color);
        else window.localStorage.removeItem(iconPrefix + id);
        setIconError(false);
        refreshIcons();
      } catch { setIconError(true); }
    }
    const [draft, setDraft] = React.useState('');
    const [confirmReset, setConfirmReset] = React.useState(false);
    const opener = React.useRef(null);
    const state = stateView.state;
    const close = () => { store.edit(false); opener.current?.focus(); };
    const toggleEnabled = event => store.update(current => model.groupReduce(current, { type: 'enable', enabled: event.target.checked }));
    return h('div', { className: 'cs-group-launch' },
      h('style', null, style),
      h('style', null, icons.css),
      h('button', { ref: opener, type: 'button', title: t('manage'), 'aria-label': t('manage'), 'aria-expanded': stateView.editorOpen,
        onClick: () => store.edit(!stateView.editorOpen) }, h(GroupIcon)),
      stateView.editorOpen && h('section', { className: 'cs-group-editor', 'aria-label': t('manage'),
        onKeyDown: event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } } },
        h('header', null, h('strong', null, t('title')), h('button', { type: 'button', 'aria-label': t('close'), onClick: close }, '×')),
        h('label', null, h('input', { type: 'checkbox', checked: state.enabled, disabled: !stateView.compatible && !state.enabled, onChange: toggleEnabled }), ' ', t('enable')),
        !stateView.compatible && h('p', { role: 'alert' }, t('fallback')),
        stateView.error && h('div', { role: 'alert' }, stateView.error),
        h('p', null, t('note')),
        h('form', { onSubmit: event => {
          event.preventDefault();
          if (store.update(current => model.groupReduce(model.groupReduce(collapseOthers(current, null), {
            type: 'create', id: window.crypto.randomUUID(), name: draft,
          }), { type: 'enable', enabled: stateView.compatible }))) setDraft('');
        } },
          h('input', { value: draft, required: true, maxLength: 80, autoFocus: true, placeholder: t('name'), 'aria-label': t('name'), onChange: event => setDraft(event.target.value) }),
          h('button', { className: 'cs-group-create', type: 'submit' }, t('create'))),
        ...state.groups.map(group => h(EditGroup, { key: group.id, group })),
        h('h3', { className: 'cs-group-projects' }, t('projects')),
        iconError && h('p', { role: 'alert' }, t('iconError')),
        ...((workspaceView && Array.isArray(workspaceView.items)) ? workspaceView.items : []).map(workspace => h('div', {
          key: workspace.workspaceId, className: 'cs-group-assignment', title: workspace.path,
         }, h('span', null, workspace.title || workspace.path),
        h('label', null, t('group'), h('select', { value: state.assignments.find(item => item.workspaceId === workspace.workspaceId)?.groupId || '',
          'aria-label': `${workspace.title || workspace.path}: ${t('group')}`,
          onChange: event => store.update(current => model.groupReduce(current, {
            type: 'assign', workspaceId: workspace.workspaceId, groupId: event.target.value || null,
          })) }, h('option', { value: '' }, t('none')), ...state.groups.map(group => h('option', { key: group.id, value: group.id }, group.name)))),
        h('label', null, t('icon'), h('select', { value: icons.colors.get(workspace.workspaceId) || '',
          'aria-label': `${workspace.title || workspace.path}: ${t('icon')}`,
          onChange: event => selectIcon(workspace.workspaceId, event.target.value) },
          h('option', { value: '' }, t('folder')), ...Array.from(palette.keys(), color => h('option', { key: color, value: color }, t(color))))))),
        h('button', { type: 'button', onClick: () => setConfirmReset(!confirmReset) }, t('reset')),
        confirmReset && h('div', null, h('p', null, t('resetConfirm')),
          h('button', { type: 'button', onClick: () => { store.reset(); setConfirmReset(false); } }, t('confirm')),
          h('button', { type: 'button', onClick: () => setConfirmReset(false) }, t('cancel')))));
  }
  // Only one native browser is rendered at a time. Switching groups remounts
  // its local view (not Sessions). Only its catalogue hooks are filtered;
  // original callbacks, source-of-truth IDs, paths and child seats are retained.
  // Native view actions use a separate per-group in-memory store. Automatic pruning
  // of the filtered catalogue must never erase the user's standard-list preferences.
  let nativeEntry;
  const nativeViews = new Map();
  ctx.effect(() => () => nativeViews.clear());
  class BrowserBoundary extends React.Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error) { console.error('Compact sidebar group adapter:', error); }
    render() {
      return this.state.failed
        ? h('div', { role: 'alert' }, t('fallback'), h('button', { type: 'button', onClick: () => store.update(state => model.groupReduce(state, { type: 'enable', enabled: false })) }, t('standard')))
        : this.props.children;
    }
  }
  function GroupedBrowser(props) {
    const view = props.useCompactGroups(value => value);
    const ws = props.useWorkspaces(value => value);
    const [showUnassigned, setShowUnassigned] = React.useState(true);
    const state = view.state;
    const activeGroup = state.groups.find(group => !group.collapsed);
    const activeId = activeGroup?.id ?? null;
    const items = Array.isArray(ws?.items) ? ws.items : [];
    const buckets = React.useMemo(() => model.groupBuckets(state, items), [state, items]);
    const bucket = buckets.find(item => item.id === activeId);
    const ids = React.useMemo(() => bucket.workspaces.map(item => item.workspaceId), [bucket]);
    const workspaceCache = React.useMemo(() => new WeakMap(), [ids]);
    const sessionCache = React.useMemo(() => new WeakMap(), [ids, ws, activeId]);
    const useFilteredWorkspaces = React.useMemo(() => (selector, equal) => props.useWorkspaces(value => {
      if (!workspaceCache.has(value)) workspaceCache.set(value, model.groupWorkspaceView(value, ids));
      return selector(workspaceCache.get(value));
    }, equal), [props.useWorkspaces, workspaceCache, ids]);
    const useFilteredSessions = React.useMemo(() => (selector, equal) => props.useSessions(value => {
      if (!sessionCache.has(value)) sessionCache.set(value, model.groupSessionView(value, ws, ids, activeId === null));
      return selector(sessionCache.get(value));
    }, equal), [props.useSessions, sessionCache, ws, ids, activeId]);
    const nativeView = React.useMemo(() => {
      if (!nativeViews.has(activeId)) nativeViews.set(activeId, model.groupNativeViewStore());
      return nativeViews.get(activeId);
    }, [activeId]);
    const useLocalView = React.useMemo(() => selector => React.useSyncExternalStore(
      nativeView.subscribe, () => selector(nativeView.getSnapshot()), () => selector(nativeView.getSnapshot()),
    ), [nativeView]);
    const nativeProps = { ...props, useStore: useLocalView, actions: nativeView.actions };
    if (!props.wide || !Array.isArray(ws?.items)) return h(nativeEntry.component, nativeProps);
    const opened = activeId !== null || showUnassigned;
    function toggle(id) {
      if (id === null) {
        const next = activeId !== null || !showUnassigned;
        if (store.update(current => collapseOthers(current, null))) setShowUnassigned(next);
      } else {
        if (store.update(current => model.groupReduce(collapseOthers(current, id), { type: 'toggle', id }))) {
          setShowUnassigned(false);
        }
      }
    }
    return h('div', { className: 'cs-groups' },
      h('style', null, style),
      h('div', { className: 'cs-groups-top' }, h('strong', null, t('title')),
        h('button', { className: 'cs-group-tool', type: 'button', title: t('manage'), 'aria-label': t('manage'), onClick: () => store.edit(true) }, '⚙'),
        h('button', { className: 'cs-group-tool', type: 'button', title: t('standard'), 'aria-label': t('standard'), onClick: () => store.update(current => model.groupReduce(current, { type: 'enable', enabled: false })) }, '↩')),
      view.error && h('div', { role: 'alert' }, view.error),
      ...buckets.map(item => {
        const isOpen = opened && item.id === activeId;
        const name = item.name || t('none');
        return h('section', { key: item.id === null ? '__unassigned__' : `group:${item.id}`, className: 'cs-group-section', 'data-open': isOpen },
          h('button', { className: 'cs-group-head', type: 'button', 'aria-expanded': isOpen,
            title: `${isOpen ? t('collapse') : t('expand')}: ${name}`, onClick: () => toggle(item.id) },
            h('span', { 'aria-hidden': true }, isOpen ? '▾' : '▸'), h('span', null, name), h('span', { className: 'cs-group-count' }, item.workspaces.length)),
          isOpen && h('div', { className: 'cs-group-native', title: t('menuHint') },
            item.workspaces.length === 0 && item.id !== null && h('p', { className: 'cs-group-empty' }, t('empty')),
            h(BrowserBoundary, { key: item.id || 'unassigned' }, h(nativeEntry.component, {
              ...nativeProps, useWorkspaces: useFilteredWorkspaces, useSessions: useFilteredSessions,
            }))));
      }));
  }
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'compact-project-groups', order: 20, locale: NS,
    inject: () => ({ hooks: { compactGroups: store } }),
  }, Footer));
  // Compatibility adapter to the installed Slot registry. Confirmed from
  // ui-workspace's own entries()/subscribe usage and StoredEntry declarations.
  // No module imports, monkey-patching, DOM moves or synthetic workspaces.
  if (typeof ctx.slots.entries !== 'function') {
    store.setCompatible(false);
    return;
  }
  ctx.slots.inject('sidebar.workspaces', () => {
    let wrapped;
    let original;
    let syncing = false;
    let alive = true;
    function sync() {
      if (!alive || syncing) return;
      syncing = true;
      try {
        const candidate = ctx.slots.entries('sidebar.workspaces').find(entry => entry.component !== GroupedBrowser
          && entry.locale === 'workspace' && entry.children?.['sidebar.workspaces.directoryFlow']
          && typeof entry.inject === 'function' && entry.store);
        const current = store.getSnapshot();
        const wanted = current.state.enabled && candidate;
        if (wrapped && (!wanted || candidate !== original)) { wrapped(); wrapped = undefined; original = undefined; }
        if (current.compatible !== !!candidate) store.setCompatible(!!candidate);
        if (wanted && !wrapped) {
          nativeEntry = candidate;
          original = candidate;
          wrapped = ctx.slots.register({
            name: 'sidebar.workspaces', priority: -20,
            children: candidate.children, locale: candidate.locale,
            inject: (...args) => {
              const injected = candidate.inject(...args);
              return { ...injected, hooks: { ...injected.hooks, compactGroups: store } };
            },
          }, GroupedBrowser);
        }
      } catch (error) {
        if (wrapped) { wrapped(); wrapped = undefined; }
        store.setCompatible(false);
        console.error('Compact sidebar could not register grouped browser:', error);
      } finally { syncing = false; }
    }
    const unlisten = ctx.on('slots/changed', key => { if (key === 'sidebar.workspaces') sync(); });
    const unsubscribe = store.subscribe(sync);
    sync();
    return () => { alive = false; unsubscribe(); unlisten(); wrapped?.(); };
  });
}
