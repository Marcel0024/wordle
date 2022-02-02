import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Evaluation } from '../interfaces/state';
import { FoundLetter } from '../services/game.service';

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss'],
})
export class KeyboardComponent implements OnInit {
  @Input() rows!: string[][];
  @Input() foundLetters: FoundLetter[] = [];

  @Output() onClick = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  letterClicked(letter: string): void {
    this.onClick.emit(letter);
  }

  getEvaluation(letter: string): Evaluation | undefined {
    const foundLetter = this.foundLetters.find((x) => x.letter === letter);

    return foundLetter ? foundLetter.evaluation : undefined;
  }
}
