// 착시의 탑 레벨 설계 원본 (사람이 읽는 형태).
// node levels/gen.js 가 이 파일을 읽어 levels/levels.js 를 만든다.
// 좌표 [x,y,z]: z가 위. 화면 위치는 (x−z, y−z)로 정해지고, 화면에서 맞닿은 윗면끼리 연결된다.
'use strict';

// ---- 도우미 ----
// 두 점 사이 직선 (축 하나만 다를 때)
function line(a, b) {
  const out = [];
  const d = [0, 1, 2].map(function (i) { return Math.sign(b[i] - a[i]); });
  let p = a.slice();
  for (;;) {
    out.push(p.slice());
    if (p[0] === b[0] && p[1] === b[1] && p[2] === b[2]) break;
    p = [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
  }
  return out;
}
// (x,y,top) 아래를 바닥(z=bottom)까지 채우는 장식 기둥. top 자체는 넣지 않는다.
function pillar(x, y, top, bottom) {
  const out = [];
  for (let z = bottom || 0; z < top; z++) out.push([x, y, z]);
  return out;
}
// 세로 기둥 (z0..z1 포함)
function column(x, y, z0, z1) { return line([x, y, z0], [x, y, z1]); }

// 화면 칸 (u,v) = (x−z, y−z)와 높이 z로 큐브 좌표를 만든다 (9단계부터 사용).
function at(u, v, z) { return [u + z, v + z, z]; }
// 큐브 c 아래 장식 기둥
function under(c) { return pillar(c[0], c[1], c[2]); }

const LEVELS = [];

// 1. 첫 걸음 — 걷기만. 높이 2의 꺾인 길.
LEVELS.push({
  name: '첫 걸음',
  hint: '가고 싶은 칸을 누르면 그곳까지 걸어갑니다. 목표 칸까지 가 보세요.',
  expect: 0,
  cubes: [
    line([0, 0, 2], [3, 0, 2]), line([3, 1, 2], [3, 3, 2]), line([4, 3, 2], [5, 3, 2]),
    pillar(0, 0, 2), pillar(3, 0, 2), pillar(3, 3, 2), pillar(5, 3, 2)
  ],
  groups: [],
  start: [0, 0, 2], goal: [5, 3, 2]
});

// 2. 도개교 — 서 있는 다리(y축 회전)를 뒤쪽으로 눕혀 틈을 잇는다.
//    의도한 해법: A1 → 건너기.
LEVELS.push({
  name: '도개교',
  hint: '회전 버튼을 누르면 서 있던 다리가 내려와 길이 이어집니다.',
  expect: 1,
  cubes: [
    line([6, 3, 2], [6, 0, 2]), line([5, 0, 2], [4, 0, 2]),
    line([0, 0, 2], [0, 3, 2]),
    pillar(6, 3, 2), pillar(6, 0, 2), pillar(3, 0, 2), pillar(0, 0, 2), pillar(0, 3, 2)
  ],
  groups: [
    { pivot: [3, 0, 2], axis: 'y', angle: -90, cubes: column(3, 0, 2, 4) }
  ],
  start: [6, 3, 2], goal: [0, 3, 2]
});

// 3. 두 개의 팔 — 따로 도는 두 팔(z축)을 모두 돌려야 한다.
//    의도한 해법: A1, B1 (순서 무관) → 걷기.
LEVELS.push({
  name: '두 개의 팔',
  hint: '팔이 두 개입니다. 두 팔이 모두 길을 향해야 끝까지 갈 수 있어요.',
  expect: 2,
  cubes: [
    line([0, 0, 2], [1, 0, 2]),
    line([5, 0, 2], [5, 2, 2]),
    line([5, 6, 2], [4, 6, 2]),
    pillar(0, 0, 2), pillar(2, 0, 2), pillar(5, 0, 2), pillar(5, 3, 2), pillar(4, 6, 2)
  ],
  groups: [
    { pivot: [2, 0, 2], axis: 'z', angle: 90, cubes: [[2, 0, 2], [2, -1, 2], [2, -2, 2]] },
    { pivot: [5, 3, 2], axis: 'z', angle: -90, cubes: [[5, 3, 2], [4, 3, 2], [3, 3, 2]] }
  ],
  start: [0, 0, 2], goal: [4, 6, 2]
});

// 4. 되돌리는 다리 — 다리를 돌려 건넌 뒤, 다시 돌려 반대편 길을 잇는다.
//    의도한 해법: A1 → 섬 (4,3,2)/(5,3,2)/(5,4,2)로 건너기 → A0 → 목표.
LEVELS.push({
  name: '되돌리는 다리',
  hint: '다리를 건넌 다음, 같은 다리를 한 번 더 돌려 보세요.',
  expect: 2,
  cubes: [
    line([0, 1, 2], [0, 4, 2]), [1, 4, 2],
    [4, 3, 2], [5, 3, 2], [5, 4, 2],
    line([4, 7, 2], [4, 8, 2]),
    pillar(0, 1, 2), pillar(0, 4, 2), pillar(4, 4, 2), pillar(5, 3, 2), pillar(4, 8, 2)
  ],
  groups: [
    { pivot: [4, 4, 2], axis: 'z', angle: 90, cubes: [[4, 4, 2], [4, 5, 2], [4, 6, 2]] }
  ],
  start: [0, 1, 2], goal: [4, 8, 2]
});

// 5. 다시 세운 기둥 — 세로 도개교. 눕히면 다리, 다시 세우면 꼭대기 (6,6,3)이
//    뒤쪽 낮은 길 K (3,4,1)과 높은 길 (6,5,3)을 화면에서 잇는다.
//    의도한 해법: A1(기둥 눕힘) → 다리 건너 B 피벗으로 → B1(팔이 K 쪽으로) → K → A0(기둥 세움) → 꼭대기 → 목표.
LEVELS.push({
  name: '다시 세운 기둥',
  hint: '기둥을 눕혀 건넌 뒤, 다시 세워 보세요. 기둥 꼭대기가 새 길이 됩니다.',
  expect: 3,
  cubes: [
    line([7, 8, 1], [7, 6, 1]),
    [3, 4, 1], [2, 4, 1],
    line([6, 5, 3], [6, 3, 3]), [5, 3, 3],
    pillar(7, 8, 1), pillar(7, 6, 1), pillar(6, 6, 1), pillar(3, 6, 1), pillar(3, 4, 1), pillar(2, 4, 1),
    pillar(6, 4, 3), pillar(5, 3, 3)
  ],
  groups: [
    { pivot: [6, 6, 1], axis: 'y', angle: -90, cubes: column(6, 6, 1, 3) },
    { pivot: [3, 6, 1], axis: 'z', angle: 90, cubes: [[3, 6, 1], [2, 6, 1]] }
  ],
  start: [7, 8, 1], goal: [5, 3, 3]
});

// 6. 손에서 손으로 — 한 팔 위에 선 채로 다른 팔을 돌려 건너가기를 두 번 반복한다.
//    A 피벗은 B 상태1 팔과, B 피벗은 A 상태0 팔과 닿아 있다. A1·B0 조합만 서로 닿지 않는다.
//    의도한 해법: A1 → A 위로 → B1 → B 위로 → A0 → A 위로 → B0 → 목표.
LEVELS.push({
  name: '손에서 손으로',
  hint: '팔 위에 서 있으면 그 팔은 돌릴 수 없지만, 다른 팔은 돌릴 수 있어요.',
  expect: 4,
  cubes: [
    line([3, 8, 2], [1, 8, 2]),
    line([3, 1, 2], [2, 1, 2]),
    pillar(3, 8, 2), pillar(1, 8, 2), pillar(1, 5, 2), pillar(3, 4, 2), pillar(2, 1, 2)
  ],
  groups: [
    { pivot: [1, 5, 2], axis: 'z', angle: 90, cubes: [[1, 5, 2], [2, 5, 2], [3, 5, 2]] },
    { pivot: [3, 4, 2], axis: 'z', angle: -90, cubes: [[3, 4, 2], [3, 3, 2], [3, 2, 2]] }
  ],
  start: [3, 8, 2], goal: [2, 1, 2]
});

// 7. 펜로즈 계단 — 계단을 세 칸 오르고, 착시 이음새를 지나 두 칸 더 오르면 평지를 따라 출발점 바로 옆으로 돌아온다.
//    다섯 칸을 올랐는데 제자리 (화면에서는 내려가는 곳이 없다). 이음새: 첫 계단 꼭대기 (6,5,6) ↔ 멀고 낮은 (0,0,1), k=−5.
//    고리는 출발점 옆 한 칸 (2,5,3)이 비어 있어 반드시 한 바퀴를 돌아야 하고, 도착한 뒤 두 팔로 손에서 손으로 건넌다.
//    의도한 해법: 한 바퀴 → (1,5,3)에서 A1 → B1 → A0 → B0 → 목표.
LEVELS.push({
  name: '펜로즈 계단',
  hint: '계단을 끝까지 올라가 보세요. 한 바퀴 돌면 처음 자리 옆으로 돌아옵니다.',
  expect: 4,
  cubes: [
    [3, 5, 3], [4, 5, 4], [5, 5, 5], [6, 5, 6],       // 첫 계단 (+x로 오름)
    [0, 0, 1], [0, 1, 2], [0, 2, 3],                  // 이음새 너머 둘째 계단 (+y로 오름)
    line([0, 3, 3], [0, 5, 3]), [1, 5, 3],            // 평지, 출발점 옆 (2,5,3)은 빈칸
    [3, 8, 3],                                        // 목표
    pillar(3, 5, 3), pillar(4, 5, 4), pillar(5, 5, 5), pillar(6, 5, 6),
    pillar(0, 1, 2), pillar(0, 2, 3), pillar(0, 5, 3), pillar(1, 5, 3),
    pillar(2, 6, 3), pillar(1, 8, 3), pillar(3, 8, 3)
  ],
  groups: [
    { pivot: [2, 6, 3], axis: 'z', angle: 90, cubes: [[2, 6, 3], [2, 7, 3]] },
    { pivot: [1, 8, 3], axis: 'z', angle: -90, cubes: [[1, 8, 3], [2, 8, 3]] }
  ],
  start: [3, 5, 3], goal: [3, 8, 3]
});

// 8. 착시의 탑 — 두 팔로 손에서 손으로 건넌 뒤, 기둥을 눕혀 건너고 다시 세우면
//    기둥 꼭대기 (3,3,5)가 뒤쪽 길 (0,1,3)과 탑 꼭대기 (2,1,4)를 화면에서 잇는다 (착시 이음새).
//    의도한 해법: A1 → B1 → A0 → B0 (6단계처럼) → C1(기둥 눕힘) → 건너기 → C0(다시 세움) → 꼭대기 → 탑.
LEVELS.push({
  name: '착시의 탑',
  hint: '지금까지 배운 것을 모두 쓰세요. 마지막엔 기둥 꼭대기가 탑 꼭대기와 이어져 보이는 순간을 찾으세요.',
  expect: 6,
  cubes: [
    line([4, 11, 3], [2, 11, 3]),
    [3, 5, 3], [3, 4, 3],
    line([0, 3, 3], [0, 1, 3]),
    [2, 1, 4],
    pillar(4, 11, 3), pillar(2, 11, 3), pillar(2, 8, 3), pillar(4, 7, 3), pillar(3, 5, 3), pillar(3, 3, 3),
    pillar(0, 3, 3), pillar(0, 1, 3), pillar(2, 1, 4)
  ],
  groups: [
    { pivot: [2, 8, 3], axis: 'z', angle: 90, cubes: [[2, 8, 3], [3, 8, 3], [4, 8, 3]] },
    { pivot: [4, 7, 3], axis: 'z', angle: -90, cubes: [[4, 7, 3], [4, 6, 3], [4, 5, 3]] },
    { pivot: [3, 3, 3], axis: 'y', angle: -90, cubes: column(3, 3, 3, 5) }
  ],
  start: [4, 11, 3], goal: [2, 1, 4]
});

// 9. 앞으로 눕는 기둥 — x축 도개교. 기둥이 보는 사람 쪽(+y)으로 눕는다.
//    아래(화면 앞)에서 출발해 눕힌 기둥을 건너 위로 올라가고, 다시 세우면 꼭대기가 다음 층과 이어진다. 이것을 두 번.
//    의도한 해법: A1 → 다리 건너 (12,7,1) → A0 → 꼭대기 (13,9,3) → (12,9,3)에서 B1 → 건너 (11,4,3) → B0 → 꼭대기 (12,6,5) → 목표.
LEVELS.push({
  name: '앞으로 눕는 기둥',
  hint: '이번 기둥은 내 쪽으로 쓰러집니다. 건너간 뒤 뒤를 돌아보세요.',
  expect: 4,
  cubes: [
    line([15, 12, 1], [13, 12, 1]),
    line([13, 8, 1], [13, 7, 1]), [12, 7, 1],
    [12, 9, 3],
    [12, 5, 3], [12, 4, 3], [11, 4, 3],
    [11, 6, 5], [10, 6, 5],
    pillar(15, 12, 1), pillar(13, 9, 1), pillar(12, 7, 1), pillar(12, 9, 3), pillar(12, 6, 3),
    pillar(11, 4, 3), pillar(10, 6, 5)
  ],
  groups: [
    { pivot: [13, 9, 1], axis: 'x', angle: -90, cubes: column(13, 9, 1, 3) },
    { pivot: [12, 6, 3], axis: 'x', angle: -90, cubes: column(12, 6, 3, 5) }
  ],
  start: [15, 12, 1], goal: [10, 6, 5]
});

// 10. 두 팔 기둥 (초안)
LEVELS.push({
  name: '두 팔 기둥',
  hint: '한 번 돌리면 위아래 두 팔이 함께 움직입니다.',
  expect: 5,
  cubes: [
    [7, 13, 1], [7, 12, 1],
    at(5, 9, 1), at(4, 9, 1), at(3, 9, 1), at(3, 8, 1), at(2, 8, 1), at(2, 7, 1), at(2, 6, 1),
    at(4, 7, 3),
    at(4, 4, 3), at(3, 4, 3), at(2, 4, 3),
    at(2, 0, 3), at(2, -1, 3), at(1, -1, 3),
    at(-1, -1, 5), at(-2, -1, 5),
    under([7, 13, 1]), under([7, 9, 1]), under(at(2, 6, 1)), under(at(3, 9, 1)),
    under(at(2, 4, 3)), under(at(2, 1, 3)), under(at(1, -1, 3)), under(at(-2, -1, 5))
  ],
  groups: [
    { pivot: [7, 9, 1], axis: 'z', angle: 90, cubes: [column(7, 9, 1, 3), [8, 9, 1], [9, 9, 1], [6, 9, 3]] },
    { pivot: at(2, 1, 3), axis: 'x', angle: -90, cubes: column(5, 4, 3, 5) }
  ],
  start: [7, 13, 1], goal: at(-2, -1, 5)
});

// 11. 회전 계단 (초안)
LEVELS.push({
  name: '회전 계단',
  hint: '계단은 돌릴 수 있지만, 계단 위에 서 있으면 돌릴 수 없어요. 계단 아래에 발 디딜 곳이 있나요?',
  expect: 6,
  cubes: [
    [11, 8, 1], [10, 8, 1], [9, 8, 1],
    [9, 4, 1], [9, 3, 1], [8, 3, 1],
    [9, 6, 3],
    [8, 9, 2],
    [6, 9, 3],
    [6, 5, 3], [6, 4, 3], [5, 4, 3],
    [5, 6, 5], [4, 6, 5],
    under([11, 8, 1]), under([9, 8, 1]), under([9, 5, 1]), under([9, 3, 1]), under([8, 3, 1]),
    under([7, 7, 1]), under([8, 9, 2]), under([6, 9, 3]), under([6, 6, 3]), under([5, 4, 3]), under([4, 6, 5])
  ],
  groups: [
    { pivot: [9, 5, 1], axis: 'x', angle: -90, cubes: column(9, 5, 1, 3) },
    { pivot: [7, 7, 1], axis: 'z', angle: -90, cubes: [[7, 7, 1], [7, 8, 2], [7, 9, 3]] },
    { pivot: [6, 6, 3], axis: 'x', angle: -90, cubes: column(6, 6, 3, 5) }
  ],
  start: [11, 8, 1], goal: [4, 6, 5]
});

// 12. 내려가는 계단 (초안2)
LEVELS.push({
  name: '내려가는 계단',
  hint: '높은 탑 꼭대기로 가는 길은 올라가는 계단이 아닐 수도 있어요.',
  expect: 6,
  cubes: [
    [15, 15, 2], [14, 15, 2],
    [10, 15, 2], [9, 15, 2], [9, 14, 2],
    [8, 13, 2],
    at(5, 9, 2), at(4, 9, 2), at(3, 9, 2), at(3, 8, 2), at(2, 8, 2), at(2, 7, 2), at(2, 6, 2),
    at(4, 7, 4),
    at(4, 4, 4), at(5, 4, 3),
    at(7, 4, 5),
    under([15, 15, 2]), under([14, 15, 2]), under([11, 15, 2]), under([9, 14, 2]), under([8, 13, 2]),
    under([8, 10, 2]), under(at(2, 6, 2)), under(at(3, 9, 2)),
    under(at(5, 4, 3)), under(at(6, 3, 2)), under(at(7, 4, 5))
  ],
  groups: [
    { pivot: [11, 15, 2], axis: 'y', angle: 90, cubes: column(11, 15, 2, 4) },
    { pivot: [8, 10, 2], axis: 'z', angle: 90, cubes: [column(8, 10, 2, 4), [9, 10, 2], [10, 10, 2], [7, 10, 4]] },
    { pivot: at(6, 3, 2), axis: 'z', angle: -90, cubes: [at(6, 3, 2), at(5, 3, 2)] }
  ],
  start: [15, 15, 2], goal: at(7, 4, 5)
});

// 13. 세 기둥 (초안)
LEVELS.push({
  name: '세 기둥',
  hint: '세 기둥 꼭대기가 하나의 길입니다. 세 기둥이 모두 같은 모습일 때를 기다려 보세요.',
  expect: 6,
  cubes: [
    [6, 9, 2], [6, 10, 2],
    [7, 6, 4], [5, 4, 4], [4, 4, 4],
    under([6, 10, 2]), under([6, 6, 2]), under([6, 5, 2]), under([5, 5, 2]), under([4, 4, 4])
  ],
  groups: [
    { pivot: [6, 6, 2], axis: 'x', angle: -90, cubes: column(6, 6, 2, 4) },
    { pivot: [6, 5, 2], axis: 'y', angle: 90, cubes: column(6, 5, 2, 4) },
    { pivot: [5, 5, 2], axis: 'y', angle: -90, cubes: column(5, 5, 2, 4) }
  ],
  start: [6, 10, 2], goal: [4, 4, 4]
});

// 14. 어려운 조합 (초안)
LEVELS.push((function () {
  // 화면 좌표 (s, t) = (u−v, u+v): s는 가로, t는 아래로 커진다.
  function p(s, t, z) { return at((s + t) / 2, (t - s) / 2, z); }
  const A = p(0, 20, 1), C = p(-2, 14, 1), B = p(-2, 6, 3);
  return {
    name: '세 가지 장치',
    hint: '눕는 기둥, 도는 계단, 두 팔 기둥. 모두 한 번씩은 만나 본 장치예요.',
    expect: 7,
    cubes: [
      p(-1, 25, 1), p(-2, 24, 1), p(-3, 23, 1),
      p(1, 19, 1), p(2, 18, 1), p(1, 17, 1),
      p(1, 15, 1), p(0, 14, 3),
      p(-3, 15, 2),
      p(-5, 11, 3), p(-4, 10, 3), p(-5, 9, 3),
      p(-4, 6, 3), p(-5, 5, 3), p(-6, 4, 3), p(-5, 3, 3), p(-6, 2, 3), p(-5, 1, 3), p(-4, 0, 3),
      p(-3, 3, 5),
      p(0, 0, 5), p(1, -1, 5), p(2, -2, 5),
      under(p(-1, 25, 1)), under(p(-3, 23, 1)), under(A), under(p(1, 17, 1)),
      under(C), under(p(-3, 15, 2)), under(p(-5, 11, 3)), under(p(-5, 9, 3)),
      under(B), under(p(-6, 4, 3)), under(p(-4, 0, 3)), under(p(2, -2, 5))
    ],
    groups: [
      { pivot: A, axis: 'x', angle: -90, cubes: column(A[0], A[1], 1, 3) },
      { pivot: B, axis: 'z', angle: 90, cubes: [column(B[0], B[1], 3, 5), [B[0] + 1, B[1], 3], [B[0] + 2, B[1], 3], [B[0] - 1, B[1], 5]] },
      { pivot: C, axis: 'z', angle: -90, cubes: [C, [C[0], C[1] + 1, 2], [C[0], C[1] + 2, 3]] }
    ],
    start: p(-1, 25, 1), goal: p(2, -2, 5)
  };
})());

// 15. 탑의 정상 — 아래 팔과 위 팔을 번갈아 돌리며 탑 꼭대기까지 (8회)
LEVELS.push((function () {
  function p(s, t, z) { return at((s + t) / 2, (t - s) / 2, z); }
  const A = p(0, 24, 1), B = p(3, 15, 3), C = p(1, 5, 5);
  return {
    name: '탑의 정상',
    hint: '마지막 탑입니다. 아래 팔과 위 팔을 번갈아 쓰며 끝까지 올라가세요.',
    expect: 8,
    cubes: [
      p(-1, 29, 1), p(-2, 28, 1), p(-3, 27, 1),
      p(1, 23, 1), p(2, 22, 1), p(1, 21, 1), p(1, 19, 1),
      p(0, 18, 3),
      p(1, 15, 3), p(0, 14, 3), p(-1, 13, 3), p(0, 12, 3), p(-1, 11, 3), p(0, 10, 3), p(1, 9, 3),
      p(2, 12, 5), p(5, 9, 5),
      p(4, 8, 5),
      p(3, 5, 5), p(4, 4, 5), p(5, 3, 5), p(4, 2, 5), p(5, 1, 5), p(4, 0, 5), p(3, -1, 5),
      p(2, 2, 7), p(-1, -1, 7), p(-2, -2, 7),
      under(p(-1, 29, 1)), under(p(-3, 27, 1)), under(A), under(p(1, 21, 1)), under(p(1, 19, 1)),
      under(B), under(p(-1, 13, 3)), under(p(1, 9, 3)),
      under(p(4, 8, 5)), under(p(5, 3, 5)), under(p(3, -1, 5)), under(p(-2, -2, 7))
    ],
    groups: [
      { pivot: A, axis: 'x', angle: -90, cubes: column(A[0], A[1], 1, 3) },
      { pivot: B, axis: 'z', angle: 90, cubes: [column(B[0], B[1], 3, 5), [B[0] + 1, B[1], 3], [B[0] + 2, B[1], 3], [B[0] - 1, B[1], 5]] },
      { pivot: C, axis: 'z', angle: -90, cubes: [column(C[0], C[1], 5, 7), [C[0], C[1] + 1, 5], [C[0], C[1] + 2, 5], [C[0], C[1] - 1, 7]] }
    ],
    start: p(-1, 29, 1), goal: p(-2, -2, 7)
  };
})());

module.exports = { LEVELS: LEVELS, line: line, pillar: pillar, column: column };
