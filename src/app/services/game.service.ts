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

  colorGold = '#b59f2b';
  colorGreen = '#538d3e';
  colorGrey = '#3a3a3c';

  gameStatus$ = new EventEmitter<GameStatus>();

  constructor(
    private readonly stateService: StateService,
    private readonly dialog: MatDialog
  ) {}

  init(force: boolean = false): void {
    let stateGrid = this.stateService.getGrid();

    if (stateGrid && !force) {
      this.grid = stateGrid;
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
            color: 'transparent',
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
        .filter((r) => r.status === Status.CHECKED)
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
        tile.color = this.colorGreen;
        tile.status = Status.CHECKED;
        tile.evaluation = Evaluation.CORRECT;
      }
    });

    row.tiles.forEach((tile, index) => {
      const currentLetter = this.grid.word[index];
      if (tile.letter === currentLetter) {
        tile.color = this.colorGreen;
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
          tile.color = this.colorGold;
          tile.evaluation = Evaluation.PRESENT;
        } else {
          tile.color = this.colorGrey;
        }
      } else {
        tile.color = this.colorGrey;
      }

      tile.status = Status.CHECKED;
    });

    row.status = Status.CHECKED;

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
            this.grid.rows.filter((x) => x.status === Status.CHECKED).length
          } biaha!`,
        },
      });
      return;
    }

    if (this.grid.rows.every((x) => x.status === Status.CHECKED)) {
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

  getOpenRow(): Row {
    return this.grid.rows.filter((r) => r.status === Status.OPEN)[0];
  }
}
