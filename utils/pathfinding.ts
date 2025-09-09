
import { Grid, Point, TileType, Colonist } from '../types';
import { GRID_WIDTH, GRID_HEIGHT } from '../constants';

export const findPath = (start: Point, end: Point, currentGrid: Grid, currentPawns: Colonist[] = []): Point[] | null => {
    if (!currentGrid || !start || !end) return null;
    const pawnPositions = new Set(currentPawns.map(p => `${p.x},${p.y}`));
    const queue: Point[][] = [[start]];
    const visited = new Set([`${start.x},${start.y}`]);
    
    const isWalkable = (x: number, y: number, isLastStep: boolean) => {
        if (y < 0 || y >= GRID_HEIGHT || x < 0 || x >= GRID_WIDTH) return false;
        if (!isLastStep && pawnPositions.has(`${x},${y}`)) return false;
        const tileType = currentGrid[y]?.[x]?.type;
        return tileType === TileType.EMPTY || 
               tileType === TileType.STORAGE || 
               tileType === TileType.DROPPED_MINERAL || 
               tileType === TileType.DROPPED_GEM || 
               tileType === TileType.BED || 
               tileType === TileType.FLOOR || 
               tileType === TileType.DROPPED_LOG || 
               tileType === TileType.DOOR || 
               tileType === TileType.SAPLING ||
               tileType === TileType.HYDROPONICS_TRAY ||
               tileType === TileType.ARCADE_MACHINE ||
               tileType === TileType.DROPPED_FOOD;
    };

    while (queue.length > 0) {
        const path = queue.shift() as Point[];
        const { x, y } = path[path.length - 1];
        if (x === end.x && y === end.y) return path;

        const neighbors = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
        for (const [nx, ny] of neighbors) {
            if (!visited.has(`${nx},${ny}`) && isWalkable(nx, ny, nx === end.x && ny === end.y)) {
                visited.add(`${nx},${ny}`);
                queue.push([...path, { x: nx, y: ny }]);
            }
        }
    }
    return null;
};