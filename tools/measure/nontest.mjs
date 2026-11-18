import fs from 'fs';
const keys = process.argv.slice(2); const out = {};
const projects = (process.env.PROJECTS ?? '').split(',').filter(Boolean)
for (const proj of projects) { const res = JSON.parse(fs.readFileSync(`out-${proj}.json`, 'utf8'));
  for (const f of res) { const t = f.filePath.includes('/src/tests/'); for (const m of f.messages) { const k = keys.find(k => ((m.ruleId || '') + ' ' + m.message).includes(k)); if (!k) continue; const o = (out[k] ||= {}); const c = (o[proj] ||= [0, 0]); c[t ? 1 : 0]++; } } }
for (const k of keys) console.log(k.padEnd(48), projects.map(p => (out[k]?.[p] ?? [0, 0]).join('+')).join('   '));
