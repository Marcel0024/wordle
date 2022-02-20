import { Evaluation, GameStatus } from './state';

export interface FoundLetter {
  letter: string;
  evaluation: Evaluation;
}

export interface GameEndResults {
  copyText: string;
  nextDay: number;
  gameStatus: GameStatus;
  totalGuesses: number;
}

export interface GameStats {
  totalGamesWon: number;
  totalGamesLost: number;
  totalGamesPlayed: number;
  wonsInTries: { tries: number; count: number }[];
  maxStreak: number;
  currentStreak: number;
}
