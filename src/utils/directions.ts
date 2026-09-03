export const SQ_DIRS = [
    { j: 1, i: 0 },
    { j: -1, i: 0 },
    { j: 0, i: 1 },
    { j: 0, i: -1 },
    { j: 1, i: 1 },
    { j: -1, i: 1 },
    { j: 1, i: -1 },
    { j: -1, i: -1 },
];

export const CUBE_NEIGHBORS = [
    { dq: +1, dr: -1, ds: 0 },
    { dq: +1, dr: 0, ds: -1 },
    { dq: 0, dr: +1, ds: -1 },
    { dq: -1, dr: +1, ds: 0 },
    { dq: -1, dr: 0, ds: +1 },
    { dq: 0, dr: -1, ds: +1 },
] as const;