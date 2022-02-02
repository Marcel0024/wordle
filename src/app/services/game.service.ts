import { EventEmitter, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { allwords } from 'words';
import { DialogComponent } from '../components/dialog/dialog.component';
import {
  Evaluation,
  GameStatus,
  Grid,
  Row,
  Status,
  Tile,
} from '../interfaces/state';
import { StateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  grid!: Grid;

  wordsLength = 5;
  tries = 6;

  gameFinishedMessage = ``;

  gameStatus$ = new EventEmitter<GameStatus>();
  foundLetters$ = new EventEmitter<FoundLetter[]>();

  constructor(
    private readonly stateService: StateService,
    private readonly dialog: MatDialog
  ) {}

  init(force: boolean = false): void {
    let stateGrid = this.stateService.getGrid();

    if (stateGrid && !force) {
      this.grid = stateGrid;
      this.checkForFoundLeters();
    } else {
      this.grid = {
        gameStatus: GameStatus.ONGOING,
        rows: [],
        word: allwords[Math.floor(Math.random() * allwords.length)],
      };

      for (let indexRow = 0; indexRow < this.tries; indexRow++) {
        const row = { tiles: [] as Tile[], status: Status.OPEN };

        for (let tileRow = 0; tileRow < this.wordsLength; tileRow++) {
          let tile: Tile = {
            letter: '',
            status: Status.OPEN,
            evaluation: Evaluation.ABSENT,
          };
          row.tiles.push(tile);
        }

        this.grid.rows.push(row);
      }
      this.stateService.updateGrid(this.grid);
    }
    this.gameStatus$.emit(this.grid.gameStatus);
  }

  typeLetter(letter: string) {
    let row = this.getOpenRow();
    let tile = row.tiles.filter((r) => r.status === Status.OPEN)[0];

    if (!tile) {
      return;
    }

    tile.letter = letter;
    tile.status = Status.FILLED;
    tile.evaluation = Evaluation.ABSENT;

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
    tile.evaluation = Evaluation.ABSENT;

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
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Oeps!',
          text: `'${word}' a wordo purba caba.`,
        },
      });
      return;
    }

    if (!allwords.includes(word)) {
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Oeps!',
          text: `${word} no ta un palabra den Papiamento.`,
        },
      });
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
        }
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
      this.grid.gameStatus = GameStatus.WON;
      this.stateService.updateGrid(this.grid);
      this.gameStatus$.emit(this.grid.gameStatus);
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Pabien!  🎉🎉',
          text: `Bo a rij e palabra den ${
            this.grid.rows.filter((x) => x.status === Status.COMPLETED).length
          } biaha!`,
        },
      });
      return;
    }

    if (this.grid.rows.every((x) => x.status === Status.COMPLETED)) {
      this.grid.gameStatus = GameStatus.LOST;
      this.gameStatus$.emit(this.grid.gameStatus);
      this.stateService.updateGrid(this.grid);
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Game Over!',
          text: `Lastima! E palabra tawata '${this.grid.word}'. Purba bo suerte next time!`,
        },
      });
      return;
    }

    this.stateService.updateGrid(this.grid);
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
              letter.evaluation = Evaluation.PRESENT;
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

  getWord(): string {
    return this.grid.word;
  }
}

export interface FoundLetter {
  letter: string;
  evaluation: Evaluation;
}
