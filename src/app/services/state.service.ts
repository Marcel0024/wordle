import { Injectable } from '@angular/core';
import { allwords } from 'src/words';
import { Grid, Row, Status, Tile } from '../interfaces/state';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  grid!: Grid;
  word!: string;

  gameFinished = false;
  gameFinishedMessage = ``;

  constructor() {}

  init(): Grid {
    this.word = allwords[Math.floor(Math.random() * allwords.length)];
    this.gameFinished = false;

    this.grid = {
      rows: [],
    };

    for (let indexRow = 0; indexRow < 6; indexRow++) {
      const row = { tiles: [] as Tile[], status: Status.OPEN };

      for (let tileRow = 0; tileRow < 6; tileRow++) {
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

    row.tiles.forEach((tile, index) => {
      const letter = this.word[index];
      if (tile.letter === letter) {
        tile.color = 'green';
      } else if (this.word.split('').includes(tile.letter)) {
        tile.color = 'gold';
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
