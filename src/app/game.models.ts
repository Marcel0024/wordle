export type Evaluation = 'unknown' | 'absent' | 'present' | 'correct';
export type GameStatus = 'ongoing' | 'won' | 'lost';
export type ModalName = 'help' | 'stats' | null;

export interface Tile {
  letter: string;
  evaluation: Evaluation;
}

export interface Game {
  status: GameStatus;
  word: string;
  rows: Tile[][];
  nextDay: number;
  wordIndex: number;
}

export interface PlayerStats {
  played: number;
  won: number;
  lost: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
}

export interface GameState {
  game: Game;
  stats: PlayerStats;
  viewedInstructions: boolean;
  modal: ModalName;
  message: string;
  busy: boolean;
  submittedRow: number | null;
  previewRows: Tile[][] | null;
  revealedTiles: number;
}

export interface LegacyStoredTile {
  letter: string;
  status: 'OPEN' | 'FILLED' | 'CHECKED';
  evaluation: 'UNKNOWN' | 'ABSENT' | 'PRESENT' | 'CORRECT';
}

export interface LegacyStoredRow {
  tiles: LegacyStoredTile[];
  status: 'OPEN' | 'CHECKED';
}

export interface LegacyStoredState {
  currentGame: {
    gameStatus: 'ONGOING' | 'WON' | 'LOST';
    word: string;
    rows: LegacyStoredRow[];
    nextDay: number;
    wordIndex: number;
  };
  user: {
    viewedInstructions: boolean;
    totalGamesPlayed: number;
    totalGamesWon: number;
    totalGamesLost: number;
    currentStreak: number;
    maxStreak: number;
    finishedGames: { tries: number; count: number }[];
  };
}
