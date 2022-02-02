import { Injectable } from '@angular/core';
import { allwords } from 'src/words';
import { Grid, Row, Status, Tile } from '../interfaces/state';

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
        };
        row.tiles.push(tile);
      }

      this.grid.rows.push(row);
    }

    return this.grid;
  }

  letterClicked(letter: string) {
    let row = this.getOpenRow();
    let tile = row.tiles.filter((r) => r.status === Status.OPEN)[0];

    if (!tile) {
      return;
    }

    tile.letter = letter;
    tile.status = Status.COMPLETED;
  }

  backspaceClicked(): void {
    let row = this.getOpenRow();
    let tile = row.tiles
      .filter((r) => r.status === Status.COMPLETED)
      .slice(-1)[0];

    if (tile) {
      tile.letter = '';
      tile.status = Status.OPEN;
    }
  }

  enterClicked(): void {
    let row = this.getOpenRow();

    if (!row.tiles.every((x) => x.status === Status.COMPLETED)) {
      return;
    }

    const word = row.tiles.map((x) => x.letter).join('');

    if (!allwords.includes(word)) {
      alert(`${word} no ta un palabra den Papiamento.`);
      return;
    }

    const wordLetters = this.word.split('');

    row.tiles.forEach((tile, index) => {
      const letter = this.word[index];
      if (tile.letter === letter) {
        tile.color = 'green';
        tile.status = Status.COMPLETED;
      }
    });

    row.tiles.forEach((tile, index) => {
      const currentLetter = this.word[index];
      if (tile.letter === currentLetter) {
        tile.color = 'green';
      } else if (wordLetters.includes(tile.letter)) {
        const totalLetters = wordLetters.filter(
          (x) => x === tile.letter
        ).length;

        const totalLettersCorrected = row.tiles.filter(
          (x) =>
            x.letter === tile.letter &&
            (x.color === 'green' || x.color === 'gold')
        ).length;

        if (tile.color === 'green') {
          // do nothing
        } else if (totalLettersCorrected < totalLetters) {
          tile.color = 'gold';
        } else {
          tile.color = 'grey';
        }
      } else {
        tile.color = 'grey';
      }

      tile.status = Status.COMPLETED;
    });

    row.status = Status.COMPLETED;

    if (this.grid.rows.some((x) => x.tiles.every((x) => x.color === 'green'))) {
      this.gameFinished = true;
      this.gameFinishedMessage = `Pabien! 🎉🎉`;
      return;
    }

    if (this.grid.rows.every((x) => x.status === Status.COMPLETED)) {
      this.gameFinished = true;
      this.gameFinishedMessage = `Jammer! E palabra tawata ${this.word}`;
      return;
    }
  }

  getOpenRow(): Row {
    return this.grid.rows.filter((r) => r.status === Status.OPEN)[0];
  }
}
