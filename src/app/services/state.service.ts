import { Injectable } from '@angular/core';
import { allwords } from 'src/words';
import { Evaluation, Grid, Row, Status, Tile } from '../interfaces/state';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  grid!: Grid;
  word!: string;

  wordsLength = 5;
  tries = 6;

  gameFinished = false;
  gameFinishedMessage = ``;

  colorGold = '#b59f2b';
  colorGreen = '#538d3e';
  colorGrey = '#3a3a3c';

  constructor() {}

  init(): Grid {
    this.word = allwords[Math.floor(Math.random() * allwords.length)];
    this.gameFinished = false;

    this.grid = {
      rows: [],
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

    return this.grid;
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
  }

  backspace(): void {
    let row = this.getOpenRow();
    let tile = row.tiles.filter((r) => r.status === Status.FILLED).slice(-1)[0];

    if (tile) {
      tile.letter = '';
      tile.status = Status.OPEN;
      tile.evaluation = Evaluation.ABSENT;
    }
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
      alert(`${word} a wordo purba caba.`);
      return;
    }

    if (!allwords.includes(word)) {
      alert(`${word} no ta un palabra den Papiamento.`);
      return;
    }

    const wordLetters = this.word.split('');

    row.tiles.forEach((tile, index) => {
      const letter = this.word[index];
      if (tile.letter === letter) {
        tile.color = this.colorGreen;
        tile.status = Status.CHECKED;
        tile.evaluation = Evaluation.CORRECT;
      }
    });

    row.tiles.forEach((tile, index) => {
      const currentLetter = this.word[index];
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
      this.gameFinished = true;
      this.gameFinishedMessage = `Pabien! 🎉🎉`;
      return;
    }

    if (this.grid.rows.every((x) => x.status === Status.CHECKED)) {
      this.gameFinished = true;
      this.gameFinishedMessage = `Jammer! E palabra tawata ${this.word}`;
      return;
    }
  }

  getOpenRow(): Row {
    return this.grid.rows.filter((r) => r.status === Status.OPEN)[0];
  }
}
