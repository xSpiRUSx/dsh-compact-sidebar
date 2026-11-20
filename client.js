window.__ModuleLoader__.load({
  id: '@local/dsh-compact-sidebar',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    // workspace-groups:start
    // Generated from groups-model/filter/store/client.js. Do not edit this section.
    const workspaceGroupsModel = (() => {
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
    function groupEmptyState() {
      return { version: 1, enabled: false, groups: [], assignments: [], collapsedWorkspaces: [] };
    }

    /** Parse persisted JSON; only null means missing. Corrupt/future data throws. */
    function groupParse(raw) {
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
    function groupReduce(state, action) {
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
    function groupBuckets(state, workspaces) {
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

    /** Pure, non-mutating view projections. Real workspace IDs and paths stay intact. */
    function groupWorkspaceView(snapshot, ids) {
      if (!snapshot || !Array.isArray(snapshot.items)) throw new Error('Incompatible WorkspaceSnapshot');
      const allowed = new Set(ids);
      return { ...snapshot, items: snapshot.items.filter(item => allowed.has(item.workspaceId)) };
    }

    function groupSessionView(list, workspaces, ids, includeOrphans) {
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

    /** Browser-preference store. backend is a synchronous key/value adapter, not a Host API. */
    function groupCreateStore(model, backend, translate) {
      let snapshot = { state: model.groupEmptyState(), error: '', editorOpen: false, compatible: true };
      const listeners = new Set();
      let disposed = false;
      const publish = patch => {
        if (disposed) return;
        snapshot = { ...snapshot, ...patch };
        for (const listener of [...listeners]) listener();
      };
      const failure = error => publish({ error: `${translate('saveError')} ${error instanceof Error ? error.message : String(error)}` });
      return {
        getSnapshot: () => snapshot,
        subscribe(listener) { if (disposed) return () => {}; listeners.add(listener); return () => listeners.delete(listener); },
        edit: editorOpen => publish({ editorOpen }),
        setCompatible: compatible => publish({ compatible }),
        load() {
          if (disposed) return;
          try { publish({ state: model.groupParse(backend.getItem()), error: '' }); }
          catch { publish({ state: model.groupEmptyState(), error: translate('storageError') }); }
        },
        update(change) {
          if (disposed) return false;
          try {
            const current = model.groupParse(backend.getItem());
            const state = model.groupParse(JSON.stringify(change(current)));
            backend.setItem(JSON.stringify(state));
            // Publish only after successful persistence, never claim a failed save worked.
            publish({ state, error: '' });
            return true;
          } catch (error) { failure(error); return false; }
        },
        reset() {
          if (disposed) return false;
          try {
            backend.removeItem();
            publish({ state: model.groupEmptyState(), error: '' });
            return true;
          } catch (error) { failure(error); return false; }
        },
        dispose() { disposed = true; listeners.clear(); },
      };
    }

    /** Isolated in-memory viewing preferences for one custom group.
     * Contract adapted to ui-workspace 0.2.2-rc.1. Never writes dsh.workspace.view.v5.
     * Filtering a catalogue must NOT feed housekeeping into the native persisted store.
     */
    function groupNativeViewStore() {
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

    return { groupEmptyState, groupParse, groupReduce, groupBuckets, groupWorkspaceView, groupSessionView, groupCreateStore, groupNativeViewStore };
    })();
    /* Source embedded by build-client.mjs. No imports of private Harness modules. */
    function installWorkspaceGroups(ctx, React, model) {
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

    /* Source embedded by build-client.mjs. Uses only the public More-menu list slot. */

    /** Native unpinned rows already expose open/pin; contribute only the missing unpin actions. */
    function panelPinnedEntries(entries) {
      return Array.isArray(entries) ? entries.filter(entry => entry.pinned === true) : [];
    }

    /** Dismiss only after the owner's preference operation has completed successfully. */
    async function panelSetPinned(id, pinned, onPinnedChange, onDismiss) {
      const result = await onPinnedChange(id, pinned);
      if (result === false) throw new Error('Panel preference change was not accepted');
      onDismiss();
    }
    function panelUnpin(id, onPinnedChange, onDismiss) {
      return panelSetPinned(id, false, onPinnedChange, onDismiss);
    }
    function panelActionEntries(entries, nativeMenuAvailable) {
      return nativeMenuAvailable ? panelPinnedEntries(entries) : (Array.isArray(entries) ? entries : []);
    }

    /** Observable availability: native toolbar pins must stay visible until this becomes true. */
    function installPanelActions(ctx, React) {
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

    /* Decorate registered panel icons through Slots, never native button DOM. */
    function panelHintLabel(label, id) {
      try {
        const value = typeof label === 'function' ? label() : label;
        return typeof value === 'string' && value.trim() ? value : id;
      } catch { return id; }
    }

    function panelHintCandidates(entries, owned) {
      const result = new Map();
      for (const entry of entries) {
        const id = entry.options?.id;
        if (typeof id !== 'string' || !id || owned.has(entry.component)) continue;
        if (!result.has(id)) result.set(id, entry);
      }
      return result;
    }

    function installPanelHints(ctx, React) {
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

    // workspace-groups:end

    // Compatibility adapter: ui-sidebar 0.2.2-rc.2 and rc.3.
    // Gate the entire layout on the verified scrollport structure. An unknown
    // shell keeps its native layout instead of receiving half a grid override.
    // No DOM queries, moves, replacement browser or native event substitutions.
    const scope = '.wtg9ga_root:has([data-compact-sidebar]):has(> .wtg9ga_scrollRegion > .wtg9ga_scrollArea[data-sidebar-scrollport])';
    const expanded = `${scope}:not(.wtg9ga_collapsed)`;
    const sessionRow = `${expanded} > :is(.wtg9ga_newSession, .wtg9ga_newSessionRow)`;
    const sessionButton = `${expanded} > .wtg9ga_newSession, ${expanded} > .wtg9ga_newSessionRow .wtg9ga_newSession`;
    // AppFrame keeps the two work columns immediately before its rightbar seat.
    // Style the grid items themselves; native drag handles stay in the gutter.
    const frame = ':not([data-sidebar-drawer]):has(> [data-shell-bottom]):has([data-compact-sidebar])';
    const workColumns = `${frame} > :is(:has(+ [data-rightbar-col]), :has(+ * + [data-rightbar-col]))`;
    const css = (newLabel) => `
      ${workColumns} {
        margin: 3px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px;
      }
      ${workColumns}:focus-within {
        border-color: var(--dsw-alias-border-l2);
      }
      ${frame}[data-sidebar-collapsed] > :has(+ * + [data-rightbar-col]) {
        border: 0;
        margin: 0;
      }
      @supports (grid-template-rows: subgrid) {
      ${scope}:not(.wtg9ga_collapsed) {
        display: grid !important;
        grid-template-columns: max-content minmax(0, 1fr);
        grid-template-rows: auto 36px minmax(0, 1fr) auto;
        column-gap: 4px;
      }
      ${scope}:not(.wtg9ga_collapsed) > .wtg9ga_topStrip,
      ${scope}:not(.wtg9ga_collapsed) > .wtg9ga_logoRow {
        grid-area: 1 / 1 / 2 / -1;
      }
      /* rc.3 places the button inside a row with the native session-action slot. */
      ${sessionRow} {
        grid-area: 2 / 1;
        position: relative;
        z-index: 1;
        align-self: center;
        margin: 0 0 4px !important;
      }
      :is(${sessionButton}) {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 68px !important;
        min-width: 68px !important;
        height: 32px !important;
        padding: 0 8px !important;
        gap: 6px;
        background: var(--dsw-alias-button-elevated-fill);
        color: var(--dsw-alias-label-primary);
      }
      :is(${sessionButton}):hover {
        background: var(--dsw-alias-interactive-bg-hover);
      }
      :is(${sessionButton})::before {
        content: '+';
        font-size: 22px;
        font-weight: 300;
        line-height: 1;
      }
      :is(${sessionButton})::after {
        content: ${JSON.stringify(newLabel)};
        font-size: 13px;
        line-height: 1;
      }
      :is(${sessionButton}) > * {
        display: none !important;
      }
      /* rc.2 nests both seats in a size-contained scroll region. Subgrid keeps
         that DOM and its native handlers while giving it the two bounded rows.
         The workspace seat becomes the size container for its 100cqh browser. */
      ${scope}:not(.wtg9ga_collapsed) > .wtg9ga_scrollRegion {
        grid-area: 2 / 1 / 4 / -1;
        display: grid;
        grid-template-columns: subgrid;
        grid-template-rows: subgrid;
        container-type: normal;
        min-width: 0;
        min-height: 0;
        margin: 0;
      }
      ${scope}:not(.wtg9ga_collapsed) > .wtg9ga_scrollRegion > .wtg9ga_scrollArea {
        grid-area: 1 / 1 / -1 / -1;
        grid-template-columns: subgrid;
        grid-template-rows: subgrid;
        min-width: 0;
        min-height: 0;
        margin: 0;
        overflow: hidden;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_scrollArea::before,
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_scrollArea::after {
        content: none;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_scrollArea > .wtg9ga_regionArea {
        grid-area: 2 / 1 / 3 / -1;
        container-type: size;
        min-width: 0;
        min-height: 0;
        zoom: 0.9;
      }
      ${scope}:not(.wtg9ga_collapsed) > .wtg9ga_footArea {
        grid-area: 4 / 1 / 5 / -1;
      }
      ${scope} .wtg9ga_brand {
        display: none !important;
      }
      ${scope} > .wtg9ga_logoRow {
        height: 32px !important;
        min-height: 32px !important;
        margin: 0 !important;
        padding: 0 !important;
        justify-content: flex-end !important;
      }
      /* Original panel launchers retain their actions, accessible names and
         focus rings. Hide inline pins only while our More contribution is live. */
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_scrollArea > .wtg9ga_panelList {
        grid-area: 1 / 2;
        display: flex !important;
        flex-flow: row nowrap !important;
        align-items: center;
        justify-content: flex-start;
        gap: 4px !important;
        min-width: 0;
        min-height: 0;
        padding: 0 !important;
        margin: 0 0 4px !important;
        overflow-x: auto;
        overflow-y: hidden;
        /* Keep the full 32px for controls even with non-overlay scrollbars.
           Horizontal gestures and keyboard focus still scroll the toolbar. */
        scrollbar-width: none;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_panelList::-webkit-scrollbar {
        display: none;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_panelList > * {
        flex: 0 0 auto;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_panelList .wtg9ga_panelEntry {
        width: 32px;
        min-width: 32px;
        border-inline: 0;
      }
      ${scope}:not(:has([data-compact-panel-actions="true"])):not(.wtg9ga_collapsed) .wtg9ga_panelList .wtg9ga_panelEntry:has(.wtg9ga_panelUnpin) {
        width: 60px;
        min-width: 60px;
      }
      ${scope}:has([data-compact-panel-actions="true"]):not(.wtg9ga_collapsed) .wtg9ga_panelList .wtg9ga_panelUnpin {
        display: none !important;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_panelList .wtg9ga_panelRow {
        width: 32px !important;
        min-width: 32px !important;
        height: 32px !important;
        flex: 0 0 32px;
        padding: 0 !important;
        gap: 0 !important;
        justify-content: center !important;
      }
      ${scope}:not(.wtg9ga_collapsed) .wtg9ga_panelList .wtg9ga_panelTitle {
        display: none !important;
      }
      html[data-windows-titlebar] ${scope} > .wtg9ga_logoRow {
        height: 0 !important;
        min-height: 0 !important;
      }
      /* The macOS traffic-light strip retains its native height. */
      html[data-platform="darwin"] ${scope} > .wtg9ga_logoRow {
        height: 0 !important;
        min-height: 0 !important;
        overflow: visible;
      }
      }
    `;

    function HiddenMark() {
      return null;
    }

    function CompactBrand({ t, useCompactPanelActions }) {
      const panelActionsReady = useCompactPanelActions(value => value);
      // React owns both the stylesheet and its availability marker. If menu
      // registration disappears, inline pin controls recover without a reload.
      return h(React.Fragment, null,
        h('span', { hidden: true, 'data-compact-sidebar': '', 'aria-hidden': true,
          'data-compact-panel-actions': panelActionsReady ? 'true' : 'false' }),
        h('style', { 'data-compact-sidebar-style': '' }, css(t('newSession.short'))),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        // The user explicitly requested the short English caption in every locale.
        for (const language of ['en', 'ru', 'zh']) {
          ctx.effect(() => ctx.locale.register('local.compact-sidebar', language, {
            'newSession.short': 'New',
          }));
        }
        installWorkspaceGroups(ctx, React, workspaceGroupsModel);
        const panelActions = installPanelActions(ctx, React);
        installPanelHints(ctx, React);
        ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register({
          name: 'sidebar.brand.mark', priority: -10,
        }, HiddenMark));
        ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({
          name: 'sidebar.brand.name', priority: -10, locale: 'local.compact-sidebar',
          inject: () => ({ hooks: { compactPanelActions: panelActions } }),
        }, CompactBrand));
      },
    };
  },
});
