// Pure-logic tests for the 착시의 탑 engine. Run: node test/logic.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(id) {
  const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'));
  if (!m) throw new Error('missing <script id="' + id + '"> block');
  return m[1];
}
const ctx = { window: {}, module: { exports: {} }, console: console };
vm.createContext(ctx);
vm.runInContext(block('levels'), ctx, { filename: 'levels' });
vm.runInContext(block('engine'), ctx, { filename: 'engine' });
const E = ctx.module.exports;
const LEVELS = ctx.window.LEVELS;

let failures = 0, passes = 0;
function check(name, cond, extra) {
  if (cond) passes++;
  else { failures++; console.log('FAIL: ' + name + (extra !== undefined ? ' -> ' + extra : '')); }
}
const J = (v) => JSON.stringify(v);
const eq = (name, a, b) => check(name, J(a) === J(b), J(a) + ' !== ' + J(b));
const near = (name, a, b) => check(name, a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9), J(a) + ' !~ ' + J(b));
const sameSet = (name, a, b) => eq(name, a.slice().sort(), b.slice().sort());

// ---- API surface ----
['project', 'buildGraph', 'bfs', 'rotatePoint', 'snapGroup', 'snapCube', 'createGame', 'hitTest', 'isWalkable'].forEach((f) =>
  check('API has ' + f, typeof E[f] === 'function'));

// ---- projection ----
near('project x', E.project([1, 0, 0], 10, 100, 50), [108.66, 55]);
near('project y', E.project([0, 1, 0], 10, 100, 50), [91.34, 55]);
near('project z', E.project([0, 0, 1], 10, 100, 50), [100, 40]);
near('project (1,1,1) == origin', E.project([1, 1, 1], 10, 0, 0), E.project([0, 0, 0], 10, 0, 0));

// ---- walkable ----
check('covered cube not walkable', !E.isWalkable([[0, 0, 0], [0, 0, 1]], [0, 0, 0]));
check('top cube walkable', E.isWalkable([[0, 0, 0], [0, 0, 1]], [0, 0, 1]));
check('missing cube not walkable', !E.isWalkable([[0, 0, 0]], [5, 5, 5]));
{
  const g = E.buildGraph([[0, 0, 0], [0, 0, 1], [1, 0, 1]]);
  check('graph excludes covered cube', !('0,0,0' in g));
  sameSet('graph nodes', Object.keys(g), ['0,0,1', '1,0,1']);
}

// ---- neighbor rule ----
{
  const g = E.buildGraph([[0, 0, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [1, 1, 0]]);
  sameSet('4-neighbours on flat', g['0,0,0'], ['1,0,0', '0,1,0', '-1,0,0', '0,-1,0']);
  check('diagonal not neighbour', g['0,0,0'].indexOf('1,1,0') < 0);
}
{ // k = +1 illusion: A=(0,0,0), T=(1,0,0), B = T+(1,1,1) = (2,1,1)
  const g = E.buildGraph([[0, 0, 0], [2, 1, 1]]);
  eq('illusion k=+1 A->B', g['0,0,0'], ['2,1,1']);
  eq('illusion k=+1 B->A (symmetric)', g['2,1,1'], ['0,0,0']);
}
{ // k = -1: A=(0,0,2), T=(1,0,2), B=(0,-1,1)
  const g = E.buildGraph([[0, 0, 2], [0, -1, 1]]);
  eq('illusion k=-1', g['0,0,2'], ['0,-1,1']);
}
{ // k = +2 along y
  const g = E.buildGraph([[0, 0, 0], [2, 3, 2]]);
  eq('illusion k=+2', g['0,0,0'], ['2,3,2']);
}
{
  const g = E.buildGraph([[0, 0, 0], [2, 0, 1]]);
  eq('step up not neighbour', g['0,0,0'], []);
  const g2 = E.buildGraph([[0, 0, 0], [2, 1, 1], [2, 1, 2]]);
  check('illusion target covered -> not neighbour', g2['0,0,0'].indexOf('2,1,1') < 0);
  // (2,1,2) = (0,-1,0) + 2*(1,1,1): a legit k=2 neighbour
  eq('stacked top reached via k=+2 instead', g2['0,0,0'], ['2,1,2']);
}

// ---- rotation & snap ----
near('rotatePoint z 90', E.rotatePoint([1, 0, 0], [0, 0, 0], 'z', 90), [0, 1, 0]);
near('rotatePoint y 90', E.rotatePoint([0, 0, 1], [0, 0, 0], 'y', 90), [1, 0, 0]);
near('rotatePoint x 90', E.rotatePoint([0, 1, 0], [0, 0, 0], 'x', 90), [0, 0, 1]);
near('rotatePoint around center', E.rotatePoint([2, 0, 0], [1, 0, 0], 'z', 90), [1, 1, 0]);
eq('snap z +90', E.snapGroup([[1, 0, 0], [0, 0, 0]], [0, 0, 0], 'z', 90), [[0, 1, 0], [0, 0, 0]]);
eq('snap z -90', E.snapGroup([[1, 0, 0]], [0, 0, 0], 'z', -90), [[0, -1, 0]]);
eq('snap y +90', E.snapGroup([[2, 0, 0], [2, 0, 1], [2, 0, 2]], [2, 0, 0], 'y', 90), [[2, 0, 0], [3, 0, 0], [4, 0, 0]]);
eq('snap y -90', E.snapGroup([[0, 0, 1]], [0, 0, 0], 'y', -90), [[-1, 0, 0]]);
eq('snap x +90', E.snapGroup([[3, 1, 2]], [3, 0, 2], 'x', 90), [[3, 0, 3]]);
eq('snap x -90', E.snapGroup([[3, 1, 2]], [3, 0, 2], 'x', -90), [[3, 0, 1]]);
['x', 'y', 'z'].forEach((ax) => {
  const cubes = [[4, 2, 1], [5, 2, 1], [4, 3, 1], [4, 2, 2], [3, 1, 0]];
  const piv = [4, 2, 1];
  eq('snap ' + ax + ' +90 then -90 round trip', E.snapGroup(E.snapGroup(cubes, piv, ax, 90), piv, ax, -90), cubes);
  let c4 = cubes;
  for (let i = 0; i < 4; i++) c4 = E.snapGroup(c4, piv, ax, 90);
  eq('snap ' + ax + ' 4x90 identity', c4, cubes);
  eq('pivot fixed on ' + ax, E.snapCube(piv, piv, ax, 90), piv);
  check('no -0 in snap ' + ax, E.snapGroup(cubes, piv, ax, 90).every((c) => c.every((v) => !Object.is(v, -0))));
});

// ---- BFS ----
{
  const g = E.buildGraph([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [0, 1, 0], [0, 2, 0], [1, 2, 0], [2, 2, 0], [5, 5, 0]]);
  eq('bfs shortest', E.bfs(g, '0,0,0', '2,1,0'), ['0,0,0', '1,0,0', '2,0,0', '2,1,0']);
  eq('bfs self', E.bfs(g, '0,0,0', '0,0,0'), ['0,0,0']);
  eq('bfs unreachable', E.bfs(g, '0,0,0', '5,5,0'), null);
  eq('bfs non-node', E.bfs(g, '0,0,0', '9,9,9'), null);
  const gi = E.buildGraph([[0, 0, 0], [2, 1, 1], [3, 1, 1]]);
  eq('bfs through illusion edge', E.bfs(gi, '0,0,0', '3,1,1'), ['0,0,0', '2,1,1', '3,1,1']);
}

// ---- hit test (front first) ----
{
  const S = 40, OX = 200, OY = 200;
  const top = (c) => E.project([c[0] + 0.5, c[1] + 0.5, c[2] + 1], S, OX, OY);
  const p = top([0, 0, 0]);
  eq('hitTest top face', E.hitTest([[0, 0, 0], [3, 0, 0]], p[0], p[1], S, OX, OY), [0, 0, 0]);
  // (1,1,1) is drawn in front of (0,0,0) at the same screen spot -> must win
  eq('hitTest front-first', E.hitTest([[0, 0, 0], [1, 1, 1]], p[0], p[1] + 2, S, OX, OY), [1, 1, 1]);
  eq('hitTest miss', E.hitTest([[0, 0, 0]], OX + 500, OY + 500, S, OX, OY), null);
}

// ---- rendering rules ----
check('visible faces are +x,+y,+z', E.FACES.filter((f) => E.faceVisible(f.n)).map((f) => J(f.n)).sort().join() === ['[0,0,1]', '[0,1,0]', '[1,0,0]'].sort().join());
check('brightness top', Math.abs(E.brightness([0, 0, 1]) - (0.62 + 0.38 * (1 / Math.hypot(0.5, 0.2, 1)))) < 1e-9);
check('brightness back face floor', Math.abs(E.brightness([0, 0, -1]) - 0.62) < 1e-9);
check('easeInOut ends', E.easeInOut(0) === 0 && E.easeInOut(1) === 1 && Math.abs(E.easeInOut(0.5) - 0.5) < 1e-9);

// ---- game: toggles, movement, retarget ----
function run(game, maxT) {
  let t = 0;
  while (game.isBusy() && t < (maxT || 60)) { game.update(1 / 60); t += 1 / 60; }
  return t;
}
{
  const level = {
    name: 't', hint: '',
    cubes: [[0, 0, 0], [1, 0, 0], [5, 0, 0], [0, 1, 0], [0, 2, 0]],
    groups: [{ pivot: [2, 0, 0], axis: 'y', angle: 90, cubes: [[2, 0, 0], [2, 0, 1], [2, 0, 2]] }],
    start: [0, 0, 0], goal: [5, 0, 0]
  };
  const g = E.createGame(level);
  eq('initial player', g.player, [0, 0, 0]);
  eq('initial group state', g.groupState(0), 0);
  check('not won initially', !g.won);
  check('goal unreachable before toggle', !g.tapTile([5, 0, 0]));
  check('can toggle at start', g.canToggle(0));
  check('invalid group index', !g.canToggle(5) && !g.toggle(5));
  check('cubes() format', g.cubes().length === 8 && g.cubes().filter((c) => c.group === 0).length === 3 && J(g.cubes()[0]) === J({ pos: [0, 0, 0], group: -1 }));

  // disabled while moving
  check('tap start move', g.tapTile([0, 2, 0]));
  check('busy while moving', g.isBusy());
  check('toggle disabled while moving', !g.canToggle(0) && !g.toggle(0));
  // retarget mid-step: recompute from next tile (0,1,0) to (1,0,0)
  g.update(E.STEP_TIME * 0.5);
  eq('player still on from-tile mid-step', g.player, [0, 0, 0]);
  check('retarget while moving', g.tapTile([1, 0, 0]));
  run(g);
  eq('retarget arrives', g.player, [1, 0, 0]);

  // rotation
  check('toggle starts', g.toggle(0));
  check('busy while rotating', g.isBusy() && g.isRotating());
  check('toggle disabled during rotation', !g.canToggle(0) && !g.toggle(0));
  check('tap ignored during rotation', !g.tapTile([0, 0, 0]));
  g.update(0.3);
  check('rotation still running at 0.3s', g.isRotating());
  const r = g.rotation();
  check('rotation eased halfway', r && Math.abs(r.deg - 45) < 1e-6);
  g.update(0.31);
  check('rotation done after ~0.6s', !g.isRotating());
  eq('state 1', g.groupState(0), 1);
  sameSet('group snapped', g.cubes().filter((c) => c.group === 0).map((c) => J(c.pos)), [[2, 0, 0], [3, 0, 0], [4, 0, 0]].map((c) => J(c)));
  // walk onto the bridge, then toggle must be disabled
  check('tap onto bridge', g.tapTile([3, 0, 0]));
  run(g);
  eq('on bridge', g.player, [3, 0, 0]);
  check('toggle disabled while standing on group', !g.canToggle(0) && !g.toggle(0));
  check('tap goal', g.tapTile([5, 0, 0]));
  run(g);
  check('won on goal', g.won);
  check('toggle disabled after win', !g.canToggle(0));

  // tapping own tile while idle does nothing
  const g2 = E.createGame(level);
  check('tap own tile idle -> false', !g2.tapTile([0, 0, 0]));
  // toggling back: 1 -> 0 uses -angle
  g2.toggle(0); run(g2); g2.toggle(0); run(g2);
  eq('toggle back to state 0', g2.groupState(0), 0);
  sameSet('toggle back positions', g2.cubes().filter((c) => c.group === 0).map((c) => J(c.pos)), [[2, 0, 0], [2, 0, 1], [2, 0, 2]].map((c) => J(c)));
}

// ---- play every level in window.LEVELS ----
function solve(level) {
  const groups = level.groups || [];
  const alt = groups.map((g) => [g.cubes, E.snapGroup(g.cubes, g.pivot, g.axis, g.angle)]);
  const graphCache = new Map();
  function graphFor(mask) {
    if (!graphCache.has(mask)) {
      const cubes = level.cubes.slice();
      alt.forEach((a, i) => { for (const c of a[(mask >> i) & 1]) cubes.push(c); });
      graphCache.set(mask, E.buildGraph(cubes));
    }
    return graphCache.get(mask);
  }
  const startKey = E.key(level.start), goalKey = E.key(level.goal);
  const sk = startKey + '|0';
  const prev = new Map([[sk, null]]);
  const queue = [[startKey, 0]];
  let noToggleReach = false;
  {
    const p = E.bfs(graphFor(0), startKey, goalKey);
    noToggleReach = !!p;
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const [pk, mask] = queue[qi];
    const cur = pk + '|' + mask;
    if (pk === goalKey) {
      const actions = [];
      let k = cur;
      while (prev.get(k)) { const e = prev.get(k); actions.push(e.action); k = e.from; }
      return { actions: actions.reverse(), noToggleReach };
    }
    const g = graphFor(mask);
    const nexts = [];
    for (const n of g[pk] || []) nexts.push([n, mask, { type: 'walk', to: n }]);
    groups.forEach((gr, i) => {
      const onIt = alt[i][(mask >> i) & 1].some((c) => E.key(c) === pk);
      if (!onIt) nexts.push([pk, mask ^ (1 << i), { type: 'toggle', i }]);
    });
    for (const [np, nm, action] of nexts) {
      const nk = np + '|' + nm;
      if (prev.has(nk)) continue;
      // player tile must stay walkable after a toggle
      if (!(np in graphFor(nm))) continue;
      prev.set(nk, { from: cur, action });
      queue.push([np, nm]);
    }
  }
  return { actions: null, noToggleReach };
}

check('LEVELS is a non-empty array', Array.isArray(LEVELS) && LEVELS.length > 0);
const levelCount = LEVELS.length;
LEVELS.forEach((level, idx) => {
  const tag = 'level ' + (idx + 1) + ' (' + level.name + ')';
  check(tag + ' has name/hint', typeof level.name === 'string' && typeof level.hint === 'string');
  check(tag + ' goal is a fixed cube', level.cubes.some((c) => E.key(c) === E.key(level.goal)));
  check(tag + ' start walkable', E.isWalkable(level.cubes.concat(...(level.groups || []).map((g) => g.cubes)), level.start));
  check(tag + ' at most 3 groups', (level.groups || []).length <= 3);
  (level.groups || []).forEach((g, gi) => {
    check(tag + ' group ' + gi + ' pivot in cubes', g.cubes.some((c) => E.key(c) === E.key(g.pivot)));
    check(tag + ' group ' + gi + ' axis/angle', ['x', 'y', 'z'].indexOf(g.axis) >= 0 && (g.angle === 90 || g.angle === -90));
  });
  const sol = solve(level);
  check(tag + ' solvable', !!sol.actions);
  if (idx > 0) check(tag + ' needs a toggle', !sol.noToggleReach);
  if (!sol.actions) return;
  // compress consecutive walks into one tap on the last tile
  const plan = [];
  for (const a of sol.actions) {
    if (a.type === 'walk' && plan.length && plan[plan.length - 1].type === 'walk') plan[plan.length - 1] = a;
    else plan.push(a);
  }
  const game = E.createGame(level);
  let ok = true;
  for (const a of plan) {
    if (a.type === 'walk') ok = ok && game.tapTile(E.parseKey(a.to));
    else ok = ok && game.toggle(a.i);
    run(game);
    if (!ok) break;
  }
  check(tag + ' plays to clear via game API (' + plan.filter((a) => a.type === 'toggle').length + ' toggles)', ok && game.won, J(plan));
});

console.log(passes + ' checks passed, ' + failures + ' failed, ' + levelCount + ' levels played.');
if (failures) { console.log('Logic tests FAILED.'); process.exit(1); }
console.log('All logic tests passed.');
