export interface State {
  grid: Grid;
}

export interface Grid {
  rows: Row[];
}

export interface Row {
  tiles: Tile[];
  status: Status;
}

export interface Tile {
  letter: string;
  color: string;

  status: Status;
}

export enum Status {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
}
