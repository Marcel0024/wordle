import { EventEmitter, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import fx from 'fireworks';
import {
  delay,
  filter,
  interval,
  map,
  Subscription,
  take,
  tap,
  timer,
  toArray,
} from 'rxjs';
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

  busy = false;

  gameStatusChange$ = new EventEmitter<SettingsState>();
  foundLettersChange$ = new EventEmitter<FoundLetter[]>();
  rowsChange$ = new EventEmitter<Row[]>();

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
    let gameInState = this.stateService.getCurrentGame();

    if (gameInState) {
      this.grid = gameInState;

      if (this.grid.nextDay - new Date().valueOf() < 0) {
        if (this.grid.gameStatus === GameStatus.ONGOING) {
          this.finishGame(GameStatus.LOST);
        }
        this.createNewGame();
      }
    } else {
      this.createNewGame();
    }
    this.broadcastFoundLetters();
    this.gameStatusChange$.emit(this.stateService.getLatestState());
    this.broadastGridChange();
    this.finishGameIfNecessary();
  }

  broadastGridChange() {
    this.rowsChange$.emit(JSON.parse(JSON.stringify(this.grid.rows)));
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
    this.stateService.save(this.grid);
  }

  getTodaysWord(): { word: string; nextDay: number; wordIndex: number } {
    const epochMs = new Date('February 2, 2022 00:00:00').valueOf();
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
    if (this.busy) {
      return;
    }

    let row = this.getOpenRow();

    if (!row || this.grid.gameStatus !== GameStatus.ONGOING) {
      return; // Game is over
    }

    let tile = row.tiles.filter((r) => r.status === Status.OPEN)[0];

    if (!tile) {
      return;
    }

    tile.letter = letter;
    tile.status = Status.FILLED;
    tile.evaluation = Evaluation.UNKNOWN;

    this.stateService.save(this.grid);
    this.broadastGridChange();
  }

  backspace(): void {
    if (this.busy) {
      return;
    }

    let row = this.getOpenRow();

    if (!row) {
      return; // Game is over
    }

    let previousTile = row.tiles
      .filter((r) => r.status === Status.FILLED)
      .slice(-1)[0];

    if (!previousTile) {
      return;
    }

    previousTile.letter = '';
    previousTile.status = Status.OPEN;
    previousTile.evaluation = Evaluation.UNKNOWN;

    this.stateService.save(this.grid);
    this.broadastGridChange();
  }

  enter(): void {
    if (this.busy) {
      return;
    }

    let row = this.getOpenRow();

    if (!row || row === undefined) {
      return; // Game is over
    }

    const guessWord = row.tiles.map((x) => x.letter).join('');
    const solutionWord = this.getSolutionWord();

    if (!this.canEnterWord(row, guessWord)) {
      return;
    }

    const copyRows = JSON.parse(JSON.stringify(this.grid.rows)) as Row[];
    const rowIndex = this.grid.rows.indexOf(row);

    const evaluations = this.getEvaluations(guessWord, solutionWord);

    row.tiles.forEach((tile, index) => {
      tile.evaluation = evaluations[index]; // set the evaluation
      tile.status = Status.COMPLETED;
    });

    row.status = Status.COMPLETED;
    this.stateService.save(this.grid);

    // Update UI
    this.busy = true;
    this.rowsChange$.emit(copyRows);

    timer(0, 400) // timer for animation
      .pipe(
        take(this.tries - 1),
        map((index) => {
          copyRows[rowIndex].tiles[index].evaluation = evaluations[index]; // set the evaluation

          if (guessWord === 'PATIN') {
            // Easter egg
            const array = ['✊', '🍆', '💦', '💦', '😂'];
            copyRows[rowIndex].tiles[index].letter = array[index]; // set the evaluation
          }

          this.rowsChange$.emit(copyRows);
        }),
        toArray(),
        delay(500),
        tap(() => this.broadcastFoundLetters()), // update keyboard
        tap(() => this.finishGameIfNecessary())
      )
      .subscribe(() => {
        this.busy = false;
        if (guessWord === 'PATIN') {
          // easter egg
          this.snackBar.open('ayy 😂', undefined, { duration: 3000 });
          setTimeout(() => this.broadastGridChange(), 3000);
        }
      });
  }

  getEvaluations(guess: string, solution: string): Evaluation[] {
    const splitSolution = solution.split('');
    const splitGuess = guess.split('');

    const statuses: Evaluation[] = Array.from(Array(guess.length));
    const solutionCharsTaken = statuses.map(() => false);

    splitGuess.forEach((letter, index) => {
      if (letter === splitSolution[index]) {
        statuses[index] = Evaluation.CORRECT;
        solutionCharsTaken[index] = true;
      }
    });

    splitGuess.forEach((letter, i) => {
      if (statuses[i]) return;

      if (!splitSolution.includes(letter)) {
        // handles the absent case
        statuses[i] = Evaluation.ABSENT;
        return;
      }

      // now we are left with "present"s
      const indexOfPresentChar = splitSolution.findIndex(
        (x, index) => x === letter && !solutionCharsTaken[index]
      );

      if (indexOfPresentChar > -1) {
        statuses[i] = Evaluation.PRESENT;
        solutionCharsTaken[indexOfPresentChar] = true;
        return;
      } else {
        statuses[i] = Evaluation.ABSENT;
        return;
      }
    });

    return statuses;
  }

  finishGameIfNecessary(): boolean {
    if (
      this.grid.gameStatus === GameStatus.WON ||
      this.grid.gameStatus === GameStatus.LOST
    ) {
      return false;
    }

    if (
      this.grid.rows.some((x) =>
        x.tiles.every((x) => x.evaluation === Evaluation.CORRECT)
      )
    ) {
      this.finishGame(GameStatus.WON);
      this.startFireworks();
      return true;
    } else if (this.grid.rows.every((x) => x.status === Status.COMPLETED)) {
      this.snackBar.open(`'${this.grid?.word}'`, undefined, {
        duration: 5000,
      });
      this.finishGame(GameStatus.LOST);
      return true;
    }

    return false;
  }

  startFireworks() {
    timer(0, 1500)
      .pipe(
        take(3),
        map(() => {
          for (let index = 0; index <= 5; index++) {
            fx({
              x:
                Math.floor(Math.random() * (window.innerWidth / 2)) +
                window.innerWidth / 4,
              y:
                Math.floor(Math.random() * (window.innerHeight / 2)) +
                window.innerHeight / 4 -
                250,
              particleTimeout: 4000 + Math.floor(Math.random() * 3000),
              colors: index % 2 === 0 ? ['#538d3e', '#b59f3b'] : ['red'],
            });
          }
        })
      )
      .subscribe();
  }

  canEnterWord(currentRow: Row, guessWord: string): boolean {
    if (!currentRow.tiles.every((x) => x.status === Status.FILLED)) {
      this.snackBar.open(`'No tin suficiente letter.`);
      return false;
    }

    if (
      this.grid.rows
        .filter((r) => r.status === Status.COMPLETED)
        .some((r) => r.tiles.map((t) => t.letter).join('') === guessWord)
    ) {
      this.snackBar.open(`'${guessWord}' a wordo purba caba.`);
      return false;
    }

    if (!WORDS.includes(guessWord) && !validGuesses.includes(guessWord)) {
      this.snackBar.open(`'${guessWord}' no ta un palabra den Papiamento.`);
      return false;
    }

    return true;
  }

  finishGame(gameStatus: GameStatus): void {
    this.grid.gameStatus = gameStatus;
    this.stateService.save(this.grid);
    this.stateService.updateGameStats(gameStatus, this.getTotalGuesses());
    this.gameStatusChange$.emit(this.stateService.getLatestState());
  }

  getTotalGuesses(): number {
    return this.grid.rows.filter((x) => x.status === Status.COMPLETED).length;
  }

  broadcastFoundLetters(): void {
    const foundLetters: FoundLetter[] = [];

    this.grid.rows
      .filter((r) => r.status === Status.COMPLETED)
      .forEach((row) =>
        row.tiles.map((t) => {
          let foundLetter = foundLetters.find((x) => x.letter === t.letter);

          if (foundLetter) {
            if (
              foundLetter.evaluation === Evaluation.ABSENT ||
              (foundLetter.evaluation === Evaluation.PRESENT &&
                t.evaluation === Evaluation.CORRECT)
            ) {
              foundLetter.evaluation = t.evaluation;
            }
          } else {
            foundLetters.push({
              letter: t.letter,
              evaluation: t.evaluation,
            });
          }
        })
      );

    this.foundLettersChange$.emit(foundLetters);
  }

  getOpenRow(): Row | undefined {
    return this.grid.rows.find((r) => r.status === Status.OPEN);
  }

  toCopyText(): string {
    let string = `Papiamento Wordle\n`;
    string += `${this.getTotalGuesses()}/${this.tries} ${
      this.grid.wordIndex + 1
    }\n\n`;
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

  getSolutionWord(): string {
    return this.grid.word;
  }
}

export interface FoundLetter {
  letter: string;
  evaluation: Evaluation;
}
