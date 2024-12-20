import { Point } from "./maths";
export type TCommand = {
    order: number;
    x: number;
    y: number;
    entityId: number;
}

export type TEntity = {
    id: number;
    // states
    type: number;
    hitPoints: number;
    state: number;
    x: number;
    y: number;
    orientation: number;
    frameIndex: number;
    // Ten queuable commands
    orderQty: number;
    orderIndex: number;
    orderPool: [
        TCommand, TCommand, TCommand, TCommand, TCommand,
        TCommand, TCommand, TCommand, TCommand, TCommand
    ];
    active: boolean;
}
