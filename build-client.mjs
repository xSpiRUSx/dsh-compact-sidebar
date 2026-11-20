import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const stripExports = source => source.replace(/^export /gm, '');
const sources = await Promise.all(['groups-model.js', 'groups-filter.js', 'groups-store.js', 'groups-native-view.js', 'groups-client.js', 'panels-client.js', 'panels-hints.js'].map(read));
const generated = [
  '// workspace-groups:start',
  '// Generated from groups-model/filter/store/client.js. Do not edit this section.',
  'const workspaceGroupsModel = (() => {',
  stripExports(sources[0]), stripExports(sources[1]), stripExports(sources[2]), stripExports(sources[3]),
  'return { groupEmptyState, groupParse, groupReduce, groupBuckets, groupWorkspaceView, groupSessionView, groupCreateStore, groupNativeViewStore };',
  '})();', stripExports(sources[4]), stripExports(sources[5]), stripExports(sources[6]),
  '// workspace-groups:end',
].join('\n').split('\n').map(line => line.trimEnd() ? `    ${line.trimEnd()}` : '').join('\n');
const client = await read('client.js');
const section = /^    \/\/ workspace-groups:start\r?\n[\s\S]*?^    \/\/ workspace-groups:end/gm;
const matches = [...client.matchAll(section)];
if (matches.length !== 1) throw new Error('Expected exactly one owned generated section');
const updated = client.replace(section, () => generated);
if (process.argv.includes('--check')) {
  if (updated !== client) throw new Error('client.js is stale; run node build-client.mjs');
  console.log('Client bundle is up to date');
} else {
  await writeFile(new URL('client.js', root), updated, 'utf8');
  console.log('Built workspace groups into client.js');
}
