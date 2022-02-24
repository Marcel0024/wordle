import { Evaluation } from '../enums/evaluation';
import { GameStatus } from '../enums/gamestatus';
import { RowStatus } from '../enums/rowstatus';

export interface Game {
  gameStatus: GameStatus;
  word: string;
  rows: Row[];
  nextDay: number;
  wordIndex: number;
}

export interface Row {
  tiles: Tile[];
  status: RowStatus;
}

export interface Tile {
  letter: string;
  evaluation: Evaluation;
}
