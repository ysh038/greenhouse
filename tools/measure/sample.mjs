import fs from 'fs';
const [, , proj, pat, nStr = '6', ctxStr = '2', dirPat = ''] = process.argv;
const root = process.env.PROJECTS_DIR + '/' + proj;
const res = JSON.parse(fs.readFileSync(`out-${proj}.json`, 'utf8'));
const hits = [];
for (const f of res) for (const m of f.messages) {
  const key = (m.ruleId || '') + ' ' + m.message;
  const rel = f.filePath.replace(root + '/', '');
  if (key.includes(pat) && (!dirPat || new RegExp(dirPat).test(rel))) hits.push({ rel, f: f.filePath, m });
}
const n = +nStr, ctx = +ctxStr;
const step = Math.max(1, Math.floor(hits.length / n));
console.log(`### ${proj} "${pat}" total ${hits.length}`);
for (let i = 0, k = 0; i < hits.length && k < n; i += step, k++) {
  const h = hits[i]; const lines = fs.readFileSync(h.f, 'utf8').split('\n');
  console.log(`-- ${h.rel}:${h.m.line}  ${h.m.message.slice(0, 110)}`);
  for (let l = Math.max(1, h.m.line - ctx); l <= Math.min(lines.length, (h.m.endLine || h.m.line) + ctx, h.m.line + 6 + ctx); l++)
    console.log(`${l === h.m.line ? '>' : ' '} ${lines[l - 1].slice(0, 150)}`);
}
