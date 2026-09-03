type MovementMode = "walk" | "fly";

type MovementRange = {
    value: number;
    rgb: number;
    a: number;
};

type MovementData = {
    ranges: MovementRange[];
    mode: MovementMode;
};
