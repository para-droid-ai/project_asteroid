
export enum TileType {
  EMPTY = 'EMPTY',
  ROCK = 'ROCK',
  MINERAL = 'MINERAL',
  GEM = 'GEM',
  DROPPED_MINERAL = 'DROPPED_MINERAL',
  DROPPED_GEM = 'DROPPED_GEM',
  STORAGE = 'STORAGE',
  BED = 'BED',
  FLOOR = 'FLOOR',
  TREE = 'TREE',
  DROPPED_LOG = 'DROPPED_LOG',
  WALL = 'WALL',
  DOOR = 'DOOR',
  SAPLING = 'SAPLING'
}

export enum DesignationType {
  MINE = 'MINE',
  BUILD_FLOOR = 'BUILD_FLOOR',
  CHOP = 'CHOP',
  BUILD_WALL = 'BUILD_WALL',
  BUILD_DOOR = 'BUILD_DOOR',
  HARVEST = 'HARVEST',
  BUILD_BED = 'BUILD_BED',
  BUILD_STORAGE = 'BUILD_STORAGE'
}

export interface Point {
  x: number;
  y: number;
}

export interface Tile extends Point {
  type: TileType;
  regrowthTicks: number;
}

export type Grid = Tile[][];
export type Designations = (DesignationType | null)[][];

export type CarryingType = TileType.MINERAL | TileType.GEM | 'LOGS' | null;

export interface Colonist extends Point {
  id: string;
  task: string;
  target: Point | null;
  path: Point[];
  workTicks: number;
  carrying: CarryingType;
  energy: number;
  happiness: number;
  patience: number;
}

export interface GameEvent {
  id: string;
  duration: number;
  message: string;
  type: string;
  pauses: boolean;
}

export interface GameLogItem {
  msg: string;
  type: 'standard' | 'event';
}

export interface ColonistLogEntry {
    task: string;
    carrying: CarryingType;
}

export type ColonistLog = (ColonistLogEntry | null)[];

export type InteractionMode = 'INSPECT' | 'DESIGNATE';
