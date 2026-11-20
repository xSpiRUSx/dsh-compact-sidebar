/** Browser-preference store. backend is a synchronous key/value adapter, not a Host API. */
export function groupCreateStore(model, backend, translate) {
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
