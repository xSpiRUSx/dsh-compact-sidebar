import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const url = 'https://github.com/xSpiRUSx/dsh-compact-sidebar';
const name = '@local/dsh-compact-sidebar';
const git = (...args) => execFileSync('git', args, { cwd: fileURLToPath(root), encoding: 'utf8' }).trim();
const at = (commit, path) => git('show', `${commit}:${path}`);
const tags = git('tag', '--merged', 'HEAD', '--sort=-version:refname').split('\n')
  .filter(tag => /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag));
if (!tags.length) throw new Error('Create a vMAJOR.MINOR.PATCH tag on a release commit first');

const versions = tags.map(tag => {
  const ref = `refs/tags/${tag}`;
  const commit = git('rev-parse', `${ref}^{commit}`);
  const pkg = JSON.parse(at(commit, 'package.json'));
  if (pkg.name !== name || pkg.version !== tag.slice(1) || !pkg.dsh?.bundle?.patch) {
    throw new Error(`${tag} must point to the matching ${name} bundle`);
  }
  const publishTimestamp = Number(git('show', '-s', '--format=%ct', commit));
  return { version: pkg.version, publishTimestamp, source: { type: 'git', url, commit }, engines: pkg.engines?.dsh ? { dsh: pkg.engines.dsh } : {} };
});

const commit = versions[0].source.commit;
const locales = ['en', 'ru'].map(language => [language, JSON.parse(at(commit, `locale/${language}.json`)).meta]);
const localized = key => Object.fromEntries(locales.map(([language, meta]) => {
  if (typeof meta[key] !== 'string' || !meta[key].trim()) throw new Error(`Missing ${language} ${key}`);
  return [language, meta[key]];
}));
const index = {
  format: 1,
  title: 'Compact Sidebar',
  plugins: [{
    name,
    title: localized('title'),
    description: localized('description'),
    icon: `https://raw.githubusercontent.com/xSpiRUSx/dsh-compact-sidebar/${commit}/icon.svg`,
    author: 'xSpiRUSx',
    repository: { url },
    metadata: { keywords: ['compact-sidebar', 'sidebar', 'workspaces'] },
    versions,
  }],
};
writeFileSync(new URL('market-index.json', root), `${JSON.stringify(index, null, 2)}\n`);
