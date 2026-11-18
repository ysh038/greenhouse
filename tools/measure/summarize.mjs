import fs from 'fs';
const [, , file, root] = process.argv;
const res = JSON.parse(fs.readFileSync(file, 'utf8'));
const c = {}; const dirs = {}; let fatal = [];
for (const f of res) for (const m of f.messages) {
  if (m.fatal || !m.ruleId) { fatal.push(f.filePath.replace(root, '') + ': ' + m.message.slice(0, 160)); continue; }
  const tag = /\[([A-G]\d)\] (\S+)/.exec(m.message);
  const key = tag ? `${m.ruleId} ${tag[0]}` : m.ruleId;
  c[key] = (c[key] || 0) + 1;
  const d = f.filePath.replace(root + '/src/', '').split('/')[0];
  (dirs[key] ||= {})[d] = (dirs[key][d] || 0) + 1;
}
console.log('files', res.length, 'fatal/unknown', fatal.length); fatal.slice(0, 8).forEach(x => console.log('  !', x));
for (const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1]))
  console.log(String(v).padStart(5), k, ' | ', Object.entries(dirs[k]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, n]) => d + ':' + n).join(' '));
