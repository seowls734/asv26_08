#!/usr/bin/env node
// 착시의 탑 레벨 검증기.
//   node levels/validate.js          → 단계별 검증 결과
//   node levels/validate.js --map    → 상태별 걸을 수 있는 타일 지도도 출력
// 규칙은 CLAUDE.md "핵심 규칙"과 동일하게 구현한다.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WIDTH_LIMIT = 12.2;   // 화면 너비 약 12 단위 (12.1까지 허용)
const MAX_GROUPS = 3;
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
const LETTERS = 'ABC';

// ---------- 로딩 ----------
function loadLevels(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: file });
  return sandbox.window.LEVELS;
}

// ---------- 핵심 규칙 ----------
function key(p) { return p[0] + ',' + p[1] + ',' + p[2]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function cell(p) { return [p[0] - p[2], p[1] - p[2]]; }          // 화면 위치 (x−z, y−z)
function depth(p) { return p[0] + p[1] + p[2]; }

// 피벗 큐브 중심 기준 회전 (CLAUDE.md 축별 공식 그대로)
function rotateVec(v, axis, angleDeg) {
  const t = angleDeg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  const x = v[0], y = v[1], z = v[2];
  if (axis === 'z') return [x * c - y * s, x * s + y * c, z];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x, y * c - z * s, y * s + z * c];                       // 'x'
}
function snapCube(q, pivot, axis, angleDeg) {
  const pc = [pivot[0] + 0.5, pivot[1] + 0.5, pivot[2] + 0.5];
  const rel = [q[0] + 0.5 - pc[0], q[1] + 0.5 - pc[1], q[2] + 0.5 - pc[2]];
  const r = rotateVec(rel, axis, angleDeg);
  return [0, 1, 2].map(function (i) { return Math.round(pc[i] + r[i] - 0.5) + 0; });
}

// 그룹 g의 상태별 큐브 위치: [상태0, 상태1]
function groupStates(g) {
  const s1 = g.cubes.map(function (c) { return snapCube(c, g.pivot, g.axis, g.angle); });
  return [g.cubes.map(function (c) { return c.slice(); }), s1];
}

// mask 비트 i = 그룹 i 상태. 반환: [{p, g}] (g = -1 고정)
function world(level, gstates, mask, skip) {
  const out = [];
  level.cubes.forEach(function (c) { if (!skip || !skip.has(key(c))) out.push({ p: c, g: -1 }); });
  gstates.forEach(function (st, i) { st[(mask >> i) & 1].forEach(function (c) { out.push({ p: c, g: i }); }); });
  return out;
}

function occupancy(cubes) { const s = new Set(); cubes.forEach(function (c) { s.add(key(c.p)); }); return s; }

// 걸을 수 있는 큐브 = 바로 위 (x,y,z+1)에 큐브가 없는 큐브
function walkableList(cubes, occ) {
  return cubes.filter(function (c) { return !occ.has(key([c.p[0], c.p[1], c.p[2] + 1])); });
}

// 연결: 걸을 수 있는 A, d, T=A+d. B−T = k(1,1,1) (정수 k)인 걸을 수 있는 B는 이웃.
function buildGraph(cubes) {
  const occ = occupancy(cubes);
  const walk = walkableList(cubes, occ);
  const adj = new Map();
  walk.forEach(function (a) {
    const list = [];
    DIRS.forEach(function (d) {
      const t = add(a.p, d);
      walk.forEach(function (b) {
        const k0 = b.p[0] - t[0], k1 = b.p[1] - t[1], k2 = b.p[2] - t[2];
        if (k0 === k1 && k1 === k2) list.push(key(b.p));
      });
    });
    adj.set(key(a.p), list);
  });
  return { adj: adj, walk: walk, occ: occ };
}

function graphSignature(g) {
  const parts = [];
  g.adj.forEach(function (list, k) { parts.push(k + '>' + list.slice().sort().join('|')); });
  return parts.sort().join(';');
}

function component(g, startKey) {
  const seen = new Set([startKey]); const q = [startKey];
  while (q.length) { const k = q.shift(); (g.adj.get(k) || []).forEach(function (n) { if (!seen.has(n)) { seen.add(n); q.push(n); } }); }
  return seen;
}

// ---------- 검증 ----------
function isTriple(v) { return Array.isArray(v) && v.length === 3 && v.every(function (n) { return Number.isInteger(n); }); }

function checkFormat(level, errs) {
  if (typeof level.name !== 'string' || !level.name) errs.push('name 없음');
  if (typeof level.hint !== 'string' || !level.hint) errs.push('hint 없음');
  if (!Array.isArray(level.cubes) || !level.cubes.every(isTriple)) errs.push('cubes 형식 오류');
  if (!Array.isArray(level.groups)) errs.push('groups 형식 오류');
  if (!isTriple(level.start)) errs.push('start 형식 오류');
  if (!isTriple(level.goal)) errs.push('goal 형식 오류');
  if (errs.length) return;
  if (level.groups.length > MAX_GROUPS) errs.push('그룹이 ' + level.groups.length + '개 (최대 ' + MAX_GROUPS + ')');
  level.groups.forEach(function (g, i) {
    const L = LETTERS[i] || ('#' + i);
    if (!isTriple(g.pivot)) errs.push(L + ': pivot 형식 오류');
    if (['x', 'y', 'z'].indexOf(g.axis) < 0) errs.push(L + ': axis 오류');
    if (g.angle !== 90 && g.angle !== -90) errs.push(L + ': angle은 90 또는 -90');
    if (!Array.isArray(g.cubes) || !g.cubes.every(isTriple) || !g.cubes.length) { errs.push(L + ': cubes 형식 오류'); return; }
    if (isTriple(g.pivot) && !g.cubes.some(function (c) { return key(c) === key(g.pivot); })) errs.push(L + ': 피벗 큐브가 cubes에 없음');
  });
  if (!level.cubes.some(function (c) { return key(c) === key(level.goal); })) errs.push('goal이 고정 큐브가 아님');
}

function validateLevel(level, idx, opts) {
  const errs = [], warns = [];
  checkFormat(level, errs);
  if (errs.length) return { errs: errs, warns: warns };

  const G = level.groups.length;
  const gstates = level.groups.map(groupStates);
  // 상태1을 −angle로 되돌리면 상태0이 되는지
  level.groups.forEach(function (g, i) {
    const back = gstates[i][1].map(function (c) { return snapCube(c, g.pivot, g.axis, -g.angle); });
    if (back.map(key).join(';') !== g.cubes.map(key).join(';')) errs.push(LETTERS[i] + ': 회전 왕복이 원래 위치로 돌아오지 않음');
  });
  const masks = []; for (let m = 0; m < (1 << G); m++) masks.push(m);

  // 겹침 + 너비
  let width = 0;
  const graphs = {};
  masks.forEach(function (m) {
    const cubes = world(level, gstates, m);
    const seen = new Map();
    cubes.forEach(function (c) {
      const k = key(c.p);
      if (seen.has(k)) errs.push('상태 ' + stateName(m, G) + ': 큐브 겹침 (' + k + ')');
      seen.set(k, c);
    });
    let lo = Infinity, hi = -Infinity;
    cubes.forEach(function (c) { const u = c.p[0] - c.p[1]; lo = Math.min(lo, u); hi = Math.max(hi, u); });
    width = Math.max(width, (hi - lo + 2) * 0.866);
    graphs[m] = buildGraph(cubes);
  });
  if (width > WIDTH_LIMIT) errs.push('화면 너비 ' + width.toFixed(2) + ' > ' + WIDTH_LIMIT);

  const sk = key(level.start), gk = key(level.goal);
  if (!graphs[0].adj.has(sk)) errs.push('start가 상태0에서 걸을 수 있는 큐브가 아님');
  if (!masks.some(function (m) { return graphs[m].adj.has(gk); })) errs.push('goal이 어떤 상태에서도 걸을 수 없음');

  // 장식 기둥 = 모든 상태에서 위가 덮인 고정 큐브.
  // (1) 빼도 모든 상태의 그래프가 같아야 하고 (2) 걸을 수 있는 타일의 윗면을 가리면 안 된다.
  const support = new Set();
  level.cubes.forEach(function (c) {
    if (masks.every(function (m) { return graphs[m].occ.has(key([c[0], c[1], c[2] + 1])); })) support.add(key(c));
  });
  masks.forEach(function (m) {
    const without = buildGraph(world(level, gstates, m, support));
    if (graphSignature(without) !== graphSignature(graphs[m])) errs.push('상태 ' + stateName(m, G) + ': 장식 기둥이 길을 만들거나 끊음');
  });
  masks.forEach(function (m) {
    occlusion(world(level, gstates, m), graphs[m]).forEach(function (o) {
      const msg = '상태 ' + stateName(m, G) + ': ' + o.by + ' 가 걸을 수 있는 타일 ' + o.tile + ' 윗면을 ' + (o.full ? '모두' : '절반') + ' 가림';
      if (support.has(o.by)) errs.push('장식 기둥 ' + msg);
      else warns.push(msg);
    });
  });

  if (errs.length) return { errs: errs, warns: warns, width: width };

  // 탐색: (타일, 그룹 상태). 걷기 비용 0, 토글 비용 1 (0-1 BFS)
  const res = search(level, gstates, graphs, errs);
  if (!res) errs.push('풀 수 없음 (goal 도달 불가)');
  // 레벨 2+는 토글 없이 goal에 갈 수 없어야 한다
  const reach0 = component(graphs[0], sk);
  if (idx > 0 && reach0.has(gk)) errs.push('토글 없이 goal 도달 가능');

  if (opts.map) printMaps(level, gstates, graphs, masks, G);
  return { errs: errs, warns: warns, width: width, res: res, support: support.size };
}

function stateName(m, G) {
  if (!G) return '-';
  let s = ''; for (let i = 0; i < G; i++) s += LETTERS[i] + ((m >> i) & 1); return s;
}

// 큐브 C가 depth가 더 작은 타일 T의 윗면을 가리는지 (화면 셀 기준 정확 계산)
function occlusion(cubes, g) {
  const out = [];
  g.walk.forEach(function (t) {
    const ct = cell(t.p), dt = depth(t.p);
    let lo = null, hi = null;
    cubes.forEach(function (c) {
      if (depth(c.p) <= dt) return;
      const cc = cell(c.p), o0 = ct[0] - cc[0], o1 = ct[1] - cc[1];
      const k = key(c.p);
      if ((o0 === 0 && o1 === 0) || (o0 === 1 && o1 === 1)) { lo = lo || k; hi = hi || k; }
      else if (o0 === 1 && o1 === 0) hi = hi || k;
      else if (o0 === 0 && o1 === 1) lo = lo || k;
    });
    if (lo || hi) out.push({ tile: key(t.p), by: lo || hi, full: !!(lo && hi) });
  });
  return out;
}

function search(level, gstates, graphs, errs) {
  const G = level.groups.length;
  const sk = key(level.start), gk = key(level.goal);
  const id = function (k, m) { return k + '|' + m; };
  const dist = new Map(), parent = new Map();
  const dq = [[sk, 0]]; dist.set(id(sk, 0), 0);
  const buried = new Set();
  let found = null;
  while (dq.length) {
    const cur = dq.shift(); const k = cur[0], m = cur[1]; const d = dist.get(id(k, m));
    if (cur[2] !== undefined && cur[2] > d) continue;
    if (k === gk) { found = [k, m]; break; }
    (graphs[m].adj.get(k) || []).forEach(function (n) {
      const nid = id(n, m);
      if (!dist.has(nid) || dist.get(nid) > d) { dist.set(nid, d); parent.set(nid, { from: id(k, m), act: 'walk', at: n }); dq.unshift([n, m, d]); }
    });
    for (let i = 0; i < G; i++) {
      const gcur = gstates[i][(m >> i) & 1];
      if (gcur.some(function (c) { return key(c) === k; })) continue;          // 그 그룹 위에 서 있으면 회전 불가
      const nm = m ^ (1 << i);
      if (!graphs[nm].adj.has(k)) {                                         // 회전한 큐브가 캐릭터 위에 떨어짐
        const msg = '타일 ' + k + ' 에서 ' + LETTERS[i] + ' 회전 시 캐릭터가 묻힘';
        if (!buried.has(msg)) { buried.add(msg); errs.push(msg); }
        continue;
      }
      const nid = id(k, nm);
      if (!dist.has(nid) || dist.get(nid) > d + 1) { dist.set(nid, d + 1); parent.set(nid, { from: id(k, m), act: i, at: k, to: (nm >> i) & 1 }); dq.push([k, nm, d + 1]); }
    }
  }
  if (!found) return null;
  const steps = []; let cur = id(found[0], found[1]);
  while (parent.has(cur)) { const p = parent.get(cur); steps.unshift(p); cur = p.from; }
  const toggles = steps.filter(function (s) { return s.act !== 'walk'; });
  return {
    toggles: toggles.length,
    seq: toggles.map(function (s) { return LETTERS[s.act] + s.to + '@(' + s.at + ')'; }),
    states: dist.size
  };
}

// ---------- 지도 출력 ----------
// 격자: 열 = x−z, 행 = y−z (화면에서는 45° 돌아간 모양). 이웃은 상하좌우 칸.
// 칸 표기: 두 글자. 첫 글자 = 높이 z (10 이상은 a,b,...), 둘째 글자 = '.' 고정 / a,b,c 그룹 / S 시작 / G 목표 / * 같은 칸에 여러 개.
function printMaps(level, gstates, graphs, masks, G) {
  const all = [];
  masks.forEach(function (m) { graphs[m].walk.forEach(function (c) { all.push(cell(c.p)); }); });
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
  all.forEach(function (c) { a0 = Math.min(a0, c[0]); a1 = Math.max(a1, c[0]); b0 = Math.min(b0, c[1]); b1 = Math.max(b1, c[1]); });
  const sk = key(level.start), gk = key(level.goal);
  masks.forEach(function (m) {
    const g = graphs[m];
    const grid = new Map();
    g.walk.forEach(function (c) {
      const ck = cell(c.p).join(',');
      const z = c.p[2]; const zc = z < 10 && z >= 0 ? String(z) : (z >= 10 ? String.fromCharCode(87 + z) : '-');
      const k = key(c.p);
      const mark = k === sk ? 'S' : k === gk ? 'G' : c.g >= 0 ? 'abc'[c.g] : '.';
      grid.set(ck, grid.has(ck) ? '**' : zc + mark);
    });
    console.log('  [' + stateName(m, G) + ']  열=x−z ' + a0 + '..' + a1 + ', 행=y−z ' + b0 + '..' + b1);
    for (let b = b0; b <= b1; b++) {
      let row = '    ';
      for (let a = a0; a <= a1; a++) row += (grid.get(a + ',' + b) || ' ·') + ' ';
      console.log(row.replace(/\s+$/, ''));
    }
    // 연결 요소
    const seen = new Set(); const comps = [];
    g.walk.forEach(function (c) {
      const k = key(c.p); if (seen.has(k)) return;
      const comp = component(g, k); comp.forEach(function (x) { seen.add(x); });
      comps.push(comp);
    });
    comps.forEach(function (comp) {
      const list = Array.from(comp);
      const tag = (comp.has(sk) ? 'S' : '') + (comp.has(gk) ? 'G' : '');
      console.log('    ' + (tag ? '[' + tag + '] ' : '') + list.length + '칸: ' + list.slice(0, 40).map(function (k) { return '(' + k + ')'; }).join(' ') + (list.length > 40 ? ' …' : ''));
    });
  });
}

// ---------- main ----------
function main() {
  const args = process.argv.slice(2);
  const opts = { map: args.indexOf('--map') >= 0, quiet: args.indexOf('--quiet') >= 0 };
  const fileArg = args.find(function (a) { return !a.startsWith('--'); });
  const file = fileArg ? path.resolve(fileArg) : path.join(__dirname, 'levels.js');
  let levels;
  try { levels = loadLevels(file); } catch (e) { console.log('levels.js 로딩 실패: ' + e.message); process.exit(1); }
  if (!Array.isArray(levels) || !levels.length) { console.log('window.LEVELS 가 비어 있거나 배열이 아님'); process.exit(1); }
  const failed = [];
  levels.forEach(function (level, i) {
    const r = validateLevel(level, i, opts);
    const head = (i + 1) + '. ' + (level.name || '?');
    if (r.errs.length) {
      failed.push(i + 1);
      console.log('FAIL ' + head);
      r.errs.forEach(function (e) { console.log('     - ' + e); });
    } else {
      console.log('ok   ' + head + ' | 최소 토글 ' + r.res.toggles + ' | 해법 ' + (r.res.seq.join(' ') || '(걷기만)') +
        ' | 너비 ' + r.width.toFixed(2) + ' | 그룹 ' + level.groups.length + ' | 탐색 상태 ' + r.res.states);
    }
    if (!opts.quiet) r.warns.forEach(function (w) { console.log('     ~ 경고: ' + w); });
  });
  if (failed.length) { console.log('FAILED LEVELS: ' + failed.join(', ')); process.exit(1); }
  console.log('ALL ' + levels.length + ' LEVELS PASS');
}

if (require.main === module) main();
module.exports = { loadLevels: loadLevels, snapCube: snapCube, buildGraph: buildGraph, groupStates: groupStates, world: world, validateLevel: validateLevel, cell: cell };
