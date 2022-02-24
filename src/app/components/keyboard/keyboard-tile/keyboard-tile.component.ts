import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Evaluation } from 'src/app/enums/evaluation';

@Component({
  selector: 'app-keyboard-tile',
  templateUrl: './keyboard-tile.component.html',
  styleUrls: ['./keyboard-tile.component.scss'],
})
export class KeyboardTileComponent {
  @Input() text!: string;
  @Input() evaluation: Evaluation | undefined;
  @Input() disabled = false;

  @Output() onClick = new EventEmitter<string>();

  clicked(): void {
    this.onClick.emit(this.text);
  }

  isLargeWord(): boolean {
    return this.text.length > 2;
  }

  getCssClass(): string {
    switch (this.evaluation) {
      case Evaluation.CORRECT:
        return 'tile-green';
      case Evaluation.PRESENT:
        return 'tile-gold';
      case Evaluation.ABSENT:
        return 'tile-grey';
      case Evaluation.UNKNOWN:
        return 'transparent';
      default:
        return 'tile-light-grey';
    }
  }
}
