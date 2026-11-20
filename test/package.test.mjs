import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const text = path => readFile(new URL(path, root), 'utf8');
const shellText = async () => (await text('client.js')).replace(/\/\/ workspace-groups:start[\s\S]*?\/\/ workspace-groups:end/, '');

test('manifest exports existing runtime and display resources', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.name, '@local/dsh-compact-sidebar');
  assert.match(pkg.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.dsh.client.platform, 'web');
  assert.equal(pkg.dsh.client.immediately, true);
  assert.deepEqual(pkg.dsh.client.inject, ['@deepseek-ai/dsh-client-ui-sidebar']);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.scripts.postinstall, undefined);
  for (const key of ['.', './client', './icon']) {
    const path = pkg.exports[key].replace(/^\.\//, '');
    assert.ok(pkg.files.includes(path));
    assert.ok((await stat(new URL(path, root))).isFile());
  }
  assert.equal(pkg.exports['./locale/*.json'], './locale/*.json');
  assert.ok(pkg.files.includes('locale/*.json'));
  assert.ok(pkg.files.includes(pkg.dsh.bundle.patch.replace(/^\.\//, '')));
  const patch = await text('cordis.patch.yml');
  assert.match(patch, /id: local-compact-sidebar/);
  assert.match(patch, /name: '@local\/dsh-compact-sidebar'/);
});

test('localized metadata is meaningful and icon is bounded SVG', async () => {
  for (const locale of ['en', 'ru']) {
    const { meta } = JSON.parse(await text(`locale/${locale}.json`));
    assert.ok(meta.title.length > 5);
    assert.ok(meta.description.length > 30);
    assert.match(meta.description, /90%/);
  }
  const svg = await text('icon.svg');
  assert.match(svg, /<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.ok(Buffer.byteLength(svg) < 256 * 1024);
  assert.doesNotMatch(svg, /<script|<foreignObject|href=/i);
});

test('client uses scoped, disposable slots without DOM mutations or private imports', async () => {
  const client = await shellText();
  assert.match(client, /id: '@local\/dsh-compact-sidebar'/);
  assert.match(client, /ctx\.slots\.inject\('sidebar\.brand\.mark'/);
  assert.match(client, /ctx\.slots\.inject\('sidebar\.brand\.name'/);
  assert.match(client, /h\('style'/);
  assert.match(client, /\.wtg9ga_root:has\(\[data-compact-sidebar\]\):has\(> \.wtg9ga_scrollRegion > \.wtg9ga_scrollArea\[data-sidebar-scrollport\]\)/);
  assert.match(client, /\.wtg9ga_scrollArea > \.wtg9ga_regionArea/);
  assert.match(client, /zoom: 0\.9/);
  assert.doesNotMatch(client, /document\.|MutationObserver|setInterval|setTimeout|fetch\(|localStorage|require\('@deepseek-ai/);
  assert.doesNotMatch(client, /[A-Z]:\\/);
  assert.doesNotMatch(client, /sidebar\.workspaces',.*register/);
});

test('New Session joins the toolbar as a native compact button', async () => {
  const client = await shellText();
  assert.match(client, /grid-template-columns: max-content minmax\(0, 1fr\)/);
  assert.match(client, /grid-template-rows: auto 36px minmax\(0, 1fr\) auto/);
  assert.match(client, /const sessionRow = `\$\{expanded\} > :is\(\.wtg9ga_newSession, \.wtg9ga_newSessionRow\)`/);
  assert.match(client, /\$\{sessionRow\} \{\s*grid-area: 2 \/ 1;[^}]*z-index: 1;[^}]*margin: 0 0 4px !important;/);
  assert.match(client, /const sessionButton = `\$\{expanded\} > \.wtg9ga_newSession, \$\{expanded\} > \.wtg9ga_newSessionRow \.wtg9ga_newSession`/);
  assert.match(client, /\.wtg9ga_panelList \{\s*grid-area: 1 \/ 2;/);
  assert.match(client, /\.wtg9ga_regionArea \{\s*grid-area: 2 \/ 1 \/ 3 \/ -1;/);
  assert.match(client, /\.wtg9ga_footArea \{\s*grid-area: 4 \/ 1 \/ 5 \/ -1;/);
  assert.match(client, /width: 68px !important/);
  assert.match(client, /:is\(\$\{sessionButton\}\) > \* \{\s*display: none !important/);
  assert.match(client, /css\(t\('newSession.short'\)\)/);
  assert.match(client, /ctx\.effect\(\(\) => ctx\.locale\.register/);
  assert.match(client, /'newSession.short': 'New'/);
  assert.doesNotMatch(client, /h\('button'|startSession\(|onClick:|\.click\(/);
});

test('rc.2 scroll wrappers inherit bounded grid rows instead of collapsing in an implicit track', async () => {
  const client = await shellText();
  assert.match(client, /@supports \(grid-template-rows: subgrid\)/);
  assert.match(client, /\.wtg9ga_scrollRegion \{\s*grid-area: 2 \/ 1 \/ 4 \/ -1;[\s\S]*?grid-template-rows: subgrid;\s*container-type: normal;/);
  assert.match(client, /\.wtg9ga_scrollRegion > \.wtg9ga_scrollArea \{\s*grid-area: 1 \/ 1 \/ -1 \/ -1;[\s\S]*?grid-template-rows: subgrid;/);
  assert.match(client, /\.wtg9ga_scrollArea > \.wtg9ga_regionArea \{\s*grid-area: 2 \/ 1 \/ 3 \/ -1;\s*container-type: size;/);
  assert.doesNotMatch(client, /\$\{scope\}:not\(\.wtg9ga_collapsed\) > \.wtg9ga_(?:panelList|regionArea)\s*\{/);
  // Native viewport keeps its event handlers and scroll-state container; CSS
  // removes only its spacing pseudo-elements, not either scrolling wrapper.
  assert.doesNotMatch(client, /display: contents|\.wtg9ga_scrollRegion[^}]*display: none/s);
  assert.match(client, /\.wtg9ga_scrollArea::after \{\s*content: none;/);
});

test('toolbar is dense only while More provides the relocated unpin actions', async () => {
  const client = await shellText();
  assert.match(client, /\$\{scope\}:not\(:has\(\[data-compact-panel-actions="true"\]\)\):not\(\.wtg9ga_collapsed\).*\.wtg9ga_panelEntry:has\(\.wtg9ga_panelUnpin\) \{\s*width: 60px;/);
  assert.match(client, /\$\{scope\}:has\(\[data-compact-panel-actions="true"\]\):not\(\.wtg9ga_collapsed\).*\.wtg9ga_panelUnpin \{\s*display: none !important;/);
  assert.match(client, /const panelActionsReady = useCompactPanelActions/);
  assert.match(client, /'data-compact-panel-actions': panelActionsReady \? 'true' : 'false'/);
  assert.match(client, /compactPanelActions: panelActions/);
  assert.match(client, /installPanelHints\(ctx, React\)/);
});

test('panel navigation becomes an icon toolbar without replacing native actions', async () => {
  const client = await shellText();
  assert.match(client, /\$\{scope\}:not\(\.wtg9ga_collapsed\) \.wtg9ga_scrollArea > \.wtg9ga_panelList \{/);
  assert.match(client, /flex-flow: row nowrap !important/);
  assert.match(client, /overflow-x: auto/);
  assert.match(client, /scrollbar-width: none/);
  assert.match(client, /\.wtg9ga_panelList::-webkit-scrollbar \{\s*display: none;/);
  assert.match(client, /\.wtg9ga_panelList \.wtg9ga_panelRow \{[^}]*width: 32px !important;[^}]*height: 32px !important;/s);
  assert.match(client, /\.wtg9ga_panelList \.wtg9ga_panelTitle \{\s*display: none !important;/);
  assert.doesNotMatch(client, /onClick:|onKeyDown:|\.click\(|\.selectPanel\(|name: 'sidebar\.panellist'/);
  assert.doesNotMatch(client, /\.wtg9ga_panelActive\s*\{|outline:\s*(?:none|0)/);
  for (const language of ['ru', 'en']) {
    const { meta } = JSON.parse(await text(`locale/${language}.json`));
    assert.match(meta.description, /горизонталь|horizontal/);
  }
});
