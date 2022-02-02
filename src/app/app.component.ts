import { Component, HostListener } from '@angular/core';
import { Grid } from './interfaces/state';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public readonly stateService: StateService) {
    stateService.init();
  }

  onDisplayKeyboardClick(letter: string): void {
    if (letter === 'BACK') {
      this.stateService.backspace();
    } else if (letter === 'ENTER') {
      this.stateService.enter();
    } else {
      this.stateService.typeLetter(letter);
    }
  }

  @HostListener('document:keydown', ['$event'])
  realKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      this.stateService.backspace();
    } else if (event.key === 'Enter') {
      this.stateService.enter();
    } else {
      if (event.key.length === 1) {
        this.stateService.typeLetter(event.key.toUpperCase());
      }
    }
  }

  startNewGame(): void {
    this.stateService.init();
  }

  keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'Ñ', 'M', 'BACK'],
  ];
}
