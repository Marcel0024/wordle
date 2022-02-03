import { EventEmitter, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, interval, Subscription, tap } from 'rxjs';
import { validGuesses } from 'validguesses';
import { words as WORDS } from 'words';
import {
  Evaluation,
  GameStatus,
  Grid,
  Row,
  Status,
  Tile,
} from '../interfaces/state';
import { SettingsState, StateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  grid!: Grid;

  wordsLength = 5;
  tries = 6;

  nextDay: number = 0;

  gameStatus$ = new EventEmitter<SettingsState>();
  foundLetters$ = new EventEmitter<FoundLetter[]>();

  interval$: Subscription | undefined;

  constructor(
    private readonly stateService: StateService,
    private readonly snackBar: MatSnackBar
  ) {
    this.interval$ = interval(1000)
      .pipe(
        filter(() => this.grid?.nextDay - new Date().valueOf() < 0),
        tap(() => this.init())
      )
      .subscribe();
  }

  init(): void {
    let stateGrid = this.stateService.getGrid();

    if (stateGrid) {
      // firsttime
      this.grid = stateGrid;

      if (this.grid.nextDay - new Date().valueOf() < 0) {
        if (this.grid.gameStatus === GameStatus.ONGOING) {
          this.finishGame(GameStatus.LOST);
        }
        this.createNewGame();
      }
    } else {
      this.createNewGame();
    }
    this.checkForFoundLeters();
    this.gameStatus$.emit(this.stateService.getLatestState());
  }

  createNewGame() {
    const todays = this.getTodaysWord();
    this.grid = {
      gameStatus: GameStatus.ONGOING,
      rows: [],
      word: todays.word,
      nextDay: todays.nextDay,
      wordIndex: todays.wordIndex,
    };

    for (let indexRow = 0; indexRow < this.tries; indexRow++) {
      const row = { tiles: [] as Tile[], status: Status.OPEN };

      for (let tileRow = 0; tileRow < this.wordsLength; tileRow++) {
        let tile: Tile = {
          letter: '',
          status: Status.OPEN,
          evaluation: Evaluation.UNKNOWN,
        };
        row.tiles.push(tile);
      }

      this.grid.rows.push(row);
    }
    this.stateService.updateGrid(this.grid);
  }

  getTodaysWord(): { word: string; nextDay: number; wordIndex: number } {
    const epochMs = new Date(`February 2, 2022 00:00:00`).valueOf();
    const now = Date.now();
    const msInDay = 86400000;
    const index = Math.floor((now - epochMs) / msInDay);
    const nextDay = (index + 1) * msInDay + epochMs;
    return {
      word: WORDS[index % WORDS.length].toUpperCase(),
      nextDay: nextDay,
      wordIndex: index,
    };
  }

  typeLetter(letter: string) {
    let row = this.getOpenRow();
    let tile = row.tiles.filter((r) => r.status === Status.OPEN)[0];

    if (!tile) {
      return;
    }

    if (this.grid.gameStatus !== GameStatus.ONGOING) {
      return;
    }

    tile.letter = letter;
    tile.status = Status.FILLED;
    tile.evaluation = Evaluation.UNKNOWN;

    this.stateService.updateGrid(this.grid);
  }

  backspace(): void {
    let row = this.getOpenRow();
    let tile = row.tiles.filter((r) => r.status === Status.FILLED).slice(-1)[0];

    if (!tile) {
      return;
    }

    tile.letter = '';
    tile.status = Status.OPEN;
    tile.evaluation = Evaluation.UNKNOWN;

    this.stateService.updateGrid(this.grid);
  }

  enter(): void {
    let row = this.getOpenRow();

    if (!row.tiles.every((x) => x.status === Status.FILLED)) {
      return;
    }

    const word = row.tiles.map((x) => x.letter).join('');

    if (
      this.grid.rows
        .filter((r) => r.status === Status.COMPLETED)
        .some((r) => r.tiles.map((t) => t.letter).join('') === word)
    ) {
      this.snackBar.open(`'${word}' a wordo purba caba.`, undefined, {
        duration: 2000,
        verticalPosition: 'top',
      });
      return;
    }

    if (!WORDS.includes(word) && !validGuesses.includes(word)) {
      this.snackBar.open(
        `${word} no ta un palabra den Papiamento.`,
        undefined,
        {
          duration: 2000,
          verticalPosition: 'top',
        }
      );
      return;
    }

    const wordLetters = this.grid.word.split('');

    row.tiles.forEach((tile, index) => {
      const letter = this.grid.word[index];
      if (tile.letter === letter) {
        tile.status = Status.COMPLETED;
        tile.evaluation = Evaluation.CORRECT;
      }
    });

    row.tiles.forEach((tile, index) => {
      const currentLetter = this.grid.word[index];
      if (tile.letter === currentLetter) {
        tile.evaluation = Evaluation.CORRECT;
      } else if (wordLetters.includes(tile.letter)) {
        const totalLetters = wordLetters.filter(
          (x) => x === tile.letter
        ).length;

        const totalLettersCorrected = row.tiles.filter(
          (x) =>
            x.letter === tile.letter &&
            (x.evaluation === Evaluation.CORRECT ||
              x.evaluation === Evaluation.PRESENT)
        ).length;

        if (totalLettersCorrected < totalLetters) {
          tile.evaluation = Evaluation.PRESENT;
        } else {
          tile.evaluation = Evaluation.ABSENT;
        }
      } else {
        tile.evaluation = Evaluation.ABSENT;
      }

      tile.status = Status.COMPLETED;
    });

    row.status = Status.COMPLETED;

    this.checkForFoundLeters();

    if (
      this.grid.rows.some((x) =>
        x.tiles.every((x) => x.evaluation === Evaluation.CORRECT)
      )
    ) {
      this.finishGame(GameStatus.WON);
    }

    if (this.grid.rows.every((x) => x.status === Status.COMPLETED)) {
      this.finishGame(GameStatus.LOST);
    }

    this.stateService.updateGrid(this.grid);
  }

  finishGame(gameStatus: GameStatus): void {
    this.grid.gameStatus = gameStatus;
    this.stateService.updateGrid(this.grid);
    this.stateService.updateGameStats(
      gameStatus,
      this.grid.rows.filter((x) => x.status === Status.COMPLETED).length
    );
    this.gameStatus$.emit(this.stateService.getLatestState());
  }

  checkForFoundLeters() {
    let foundLetters: FoundLetter[] = [];

    this.grid.rows
      .filter((r) => r.status === Status.COMPLETED)
      .forEach((row) => {
        row.tiles.forEach((tile) => {
          if (tile.evaluation == Evaluation.ABSENT) {
            if (!foundLetters.some((fl) => fl.letter === tile.letter)) {
              foundLetters.push({
                letter: tile.letter,
                evaluation: Evaluation.ABSENT,
              });
            }
          }
          if (tile.evaluation == Evaluation.PRESENT) {
            let letter = foundLetters.find((fl) => fl.letter === tile.letter);
            if (!letter) {
              foundLetters.push({
                letter: tile.letter,
                evaluation: Evaluation.PRESENT,
              });
            } else {
              if (letter.evaluation !== Evaluation.CORRECT) {
                letter.evaluation = Evaluation.PRESENT;
              }
            }
          }
          if (tile.evaluation == Evaluation.CORRECT) {
            let letter = foundLetters.find((fl) => fl.letter === tile.letter);
            if (!letter) {
              foundLetters.push({
                letter: tile.letter,
                evaluation: Evaluation.CORRECT,
              });
            } else {
              letter.evaluation = Evaluation.CORRECT;
            }
          }
        });
      });

    this.foundLetters$.emit(foundLetters);
  }

  getOpenRow(): Row {
    return this.grid.rows.filter((r) => r.status === Status.OPEN)[0];
  }

  toCopyText(): string {
    const tries = this.grid.rows.filter(
      (x) => x.status === Status.COMPLETED
    ).length;

    let string = `Papiamento Wordle\n`;
    string += `${this.grid.wordIndex + 1} ${tries}/${this.tries}\n`;
    this.grid.rows
      .filter((r) => r.status === Status.COMPLETED)
      .forEach((row) => {
        let rowString = '';
        row.tiles.forEach((tile) => {
          if (tile.evaluation == Evaluation.ABSENT) {
            rowString += '⬛';
          }
          if (tile.evaluation == Evaluation.PRESENT) {
            rowString += '🟨';
          }
          if (tile.evaluation == Evaluation.CORRECT) {
            rowString += '🟩';
          }
        });

        string += rowString + '\n';
      });

    return string;
  }

  getWord(): string {
    return this.grid.word;
  }
}

export interface FoundLetter {
  letter: string;
  evaluation: Evaluation;
}
