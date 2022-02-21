import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { FoundLetter } from 'src/app/interfaces/game';
import { Evaluation } from '../../interfaces/state';

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss'],
})
export class KeyboardComponent {
  @Input() foundLetters: FoundLetter[] = [];
  @Input() disabled: boolean = false;

  @Output() onKeyPress = new EventEmitter<string>();

  keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'Ñ', 'M'],
    ['ENTER', 'BACKSPACE'],
  ];

  @HostListener('document:keydown', ['$event'])
  realKeyboardEvent(event: KeyboardEvent) {
    const key = event.key.toUpperCase();

    if (this.disabled || !this.keyboard.some((x) => x.includes(key))) {
      return;
    }

    this.onKeyPress.emit(key);
  }

  letterClicked(letter: string): void {
    if (this.disabled) {
      return;
    }

    this.onKeyPress.emit(letter);
  }

  getEvaluation(letter: string): Evaluation | undefined {
    const foundLetter = this.foundLetters.find((x) => x.letter === letter);

    return foundLetter ? foundLetter.evaluation : undefined;
  }
}
