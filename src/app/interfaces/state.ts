export interface SettingsState {
  currentGame: Game | undefined;
  grid: Game | undefined; // deprecated
  user: UserSettings;
}

export interface Game {
  gameStatus: GameStatus;
  word: string;
  rows: Row[];
  nextDay: number;
  wordIndex: number;
}

export interface Row {
  tiles: Tile[];
  status: Status;
}

export interface Tile {
  letter: string;
  status: Status;
  evaluation: Evaluation;
}

export enum Status {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  COMPLETED = 'CHECKED',
}

export enum Evaluation {
  UNKNOWN = 'UNKNOWN',
  ABSENT = 'ABSENT',
  PRESENT = 'PRESENT',
  CORRECT = 'CORRECT',
}

export enum GameStatus {
  ONGOING = 'ONGOING',
  WON = 'WON',
  LOST = 'LOST',
}

export interface UserSettings {
  viewedInstructions: boolean;
  totalGamesPlayed: number;
  totalGamesWon: number;
  totalGamesLost: number;
  currentStreak: number;
  maxStreak: number;
  finishedGames: FinishedGame[];
}

export interface FinishedGame {
  tries: number;
  count: number;
}
