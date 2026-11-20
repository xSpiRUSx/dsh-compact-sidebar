import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Optional source-contract check, not a rendered-browser or visual test.
// Desktop ASAR paths require its Electron executable with ELECTRON_RUN_AS_NODE=1.
const available = Boolean(process.versions.electron && process.env.DSH_INSTALL_DIR);
test('installed sidebar exposes the scrollport and session controls targeted by the compact CSS', {
  skip: available ? false : 'requires installed Desktop Electron and DSH_INSTALL_DIR',
}, () => {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('@deepseek-ai/dsh-client-ui-sidebar/package.json', {
    paths: [process.env.DSH_INSTALL_DIR],
  }));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const source = readFileSync(join(root, 'src/client/SidebarRoot.tsx'), 'utf8');
  const css = readFileSync(join(root, 'src/client/SidebarRoot.module.css'), 'utf8');
  const compiled = readFileSync(join(root, 'lib/client.js'), 'utf8');
  assert.match(source, /<div className=\{css\.scrollRegion\}>\s*<div[\s\S]*?className=\{css\.scrollArea\}[\s\S]*?data-sidebar-scrollport=\{wide/);
  assert.match(source, /<nav className=\{css\.panelList\}/);
  assert.match(source, /<div className=\{css\.regionArea\}>[\s\S]*?renderSlot\('sidebar\.workspaces'/);
  assert.match(css, /\.root:not\(\.collapsed\) \.scrollRegion\s*\{\s*container-type: size;/);
  const contract = readFileSync(join(root, 'src/client/contract/slots.ts'), 'utf8');
  assert.match(contract, /'sidebar.panellist.actions': \{ kind: 'list'/);
  assert.match(contract, /readonly onPinnedChange: \(id: string, pinned: boolean\) => void/);
  assert.match(contract, /readonly onDismiss: \(\) => void/);
  assert.match(source, /renderSlot\('sidebar.panellist.actions', \{ entries, onOpen, onPinnedChange, onDismiss \}\)/);
  const sessionClasses = ['newSession'];
  if (manifest.version !== '0.2.2-rc.2') {
    assert.match(source, /<div className=\{css\.newSessionRow\}>\s*\{renderSlot\('sidebar\.session\.action'[\s\S]*?<button\s+type="button"\s+className=\{css\.newSession\}/);
    sessionClasses.push('newSessionRow');
  }
  for (const name of ['root', 'collapsed', 'scrollRegion', 'scrollArea', 'regionArea', 'panelList', 'panelEntry', 'panelUnpin', 'panelRow', 'panelTitle', 'footArea', ...sessionClasses]) {
    assert.match(compiled, new RegExp(`\\bwtg9ga_${name}\\b`), `changed sidebar class: ${name}`);
  }
});
