export interface State {
  grid: Grid;
}

export interface Grid {
  gameStatus: GameStatus;
  word: string;
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
  evaluation: Evaluation;
}

export enum Status {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CHECKED = 'CHECKED',
}

export enum Evaluation {
  ABSENT = 'ABSENT',
  PRESENT = 'PRESENT',
  CORRECT = 'CORRECT',
}

export enum GameStatus {
  ONGOING = 'ONGOING',
  WON = 'WON',
  LOST = 'LOST',
}
