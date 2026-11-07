#!/usr/bin/env node
// designs.js → levels.js (한 줄: window.LEVELS = [...];)
//   node levels/gen.js
'use strict';
const fs = require('fs');
const path = require('path');
const designs = require('./designs.js').LEVELS;

function key(p) { return p.join(','); }
// 중첩 배열을 [x,y,z] 목록으로 펼치고 중복 제거
function flatten(list) {
  const out = []; const seen = new Set();
  (function walk(v) {
    if (Array.isArray(v) && v.length === 3 && v.every(function (n) { return typeof n === 'number'; })) {
      const k = key(v); if (!seen.has(k)) { seen.add(k); out.push(v.slice()); }
    } else if (Array.isArray(v)) v.forEach(walk);
    else throw new Error('잘못된 큐브: ' + JSON.stringify(v));
  })(list);
  return out;
}
function sortCubes(list) {
  return list.slice().sort(function (a, b) { return a[2] - b[2] || a[1] - b[1] || a[0] - b[0]; });
}

const levels = designs.map(function (d) {
  const groups = d.groups.map(function (g) {
    return { pivot: g.pivot.slice(), axis: g.axis, angle: g.angle, cubes: flatten(g.cubes) };
  });
  const groupKeys = new Set();
  groups.forEach(function (g) { g.cubes.forEach(function (c) { groupKeys.add(key(c)); }); });
  const cubes = sortCubes(flatten(d.cubes));
  cubes.forEach(function (c) { if (groupKeys.has(key(c))) throw new Error(d.name + ': 고정 큐브와 그룹 큐브가 겹침 ' + key(c)); });
  return { name: d.name, hint: d.hint, cubes: cubes, groups: groups, start: d.start.slice(), goal: d.goal.slice() };
});

const out = path.join(__dirname, 'levels.js');
fs.writeFileSync(out, 'window.LEVELS = ' + JSON.stringify(levels) + ';\n');
console.log('wrote ' + out + ' (' + levels.length + ' levels)');
designs.forEach(function (d, i) { console.log('  ' + (i + 1) + '. ' + d.name + ' (목표 토글 ' + d.expect + ')'); });
