
import { Point } from '../types';

export const distance = (a: Point, b: Point): number => {
    if (!a || !b) return Infinity;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};
