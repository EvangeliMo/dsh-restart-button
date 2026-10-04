// Composition simulation: apply bundle patches + user patch over the empty
// root, mirroring the loader's layer order, and assert the final state of the
// rows we care about (dsh-restart-button enabled, ui-aqua disabled).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const PROFILE = 'C:/Users/momol/.dsh/profiles/web';
const req = createRequire(join(PROFILE, 'noop.js'));
const YAML = req('yaml');
const manifest = JSON.parse(readFileSync(join(PROFILE, 'package.json'), 'utf8'));

// Layer order: each bundle's patch, then the user patch.
const layers = [];
for (const bundle of manifest.dsh.profile.bundles) {
  const pkgPath = req.resolve(`${bundle}/package.json`);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const patch = pkg.dsh?.bundle?.patch;
  if (!patch) { console.log('bundle without patch (skip):', bundle); continue; }
  layers.push({ bundle, path: join(pkgPath.replace(/[\\/]package\.json$/, ''), patch) });
}
layers.push({ bundle: '<user patch>', path: join(PROFILE, 'cordis.patch.yml') });

// Simplified merge: rows keyed by id; later layers override `disabled`/`config`.
const rows = new Map();
for (const layer of layers) {
  const text = readFileSync(layer.path, 'utf8');
  const doc = YAML.parse(text);
  if (!Array.isArray(doc)) throw new Error(`${layer.path}: not a patch list`);
  for (const entry of doc) {
    if (entry?.insert) {
      for (const row of entry.insert) {
        if (!rows.has(row.id)) rows.set(row.id, { id: row.id, name: row.name, disabled: false });
      }
    } else if (entry?.id) {
      const existing = rows.get(entry.id);
      if (existing) {
        if (entry.disabled !== undefined) existing.disabled = entry.disabled;
        if (entry.name) existing.name = entry.name;
      } else {
        rows.set(entry.id, { id: entry.id, name: entry.name, disabled: entry.disabled === true });
      }
    }
  }
}

console.log('total rows:', rows.size);
const key = (id) => {
  const r = rows.get(id);
  console.log(`  ${id}: name=${r?.name} disabled=${r?.disabled}`);
};
key('dsh-restart-button');
key('ui-aqua');
key('gal-view');
key('usage');
key('dsh-plugin-hub');

// Assertions
const rb = rows.get('dsh-restart-button');
const aqua = rows.get('ui-aqua');
if (!rb || rb.disabled) { console.log('FAIL: dsh-restart-button must be enabled'); process.exit(1); }
if (!aqua || !aqua.disabled) { console.log('FAIL: ui-aqua must stay disabled'); process.exit(1); }
console.log('COMPOSITION SIMULATION PASSED');
