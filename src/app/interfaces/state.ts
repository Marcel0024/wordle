import { Game } from './grid';

export interface SettingsState {
  currentGame: Game | undefined;
  grid: Game | undefined; // deprecated
  user: UserSettings;
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
