import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Evaluation } from 'src/app/interfaces/state';

@Component({
  selector: 'app-keyboard-tile',
  templateUrl: './keyboard-tile.component.html',
  styleUrls: ['./keyboard-tile.component.scss'],
})
export class KeyboardTileComponent implements OnInit {
  colorGold = '#b59f3b';
  colorGreen = '#538d3e';
  colorGrey = '#3a3a3c';

  @Input() text!: string;
  @Input() evaluation: Evaluation | undefined;
  @Input() disabled = false;

  @Output() onClick = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  clicked(): void {
    this.onClick.emit(this.text);
  }

  isLargeWord(): boolean {
    return this.text.length > 2;
  }

  getColor(): string {
    switch (this.evaluation) {
      case Evaluation.CORRECT:
        return this.colorGreen;
      case Evaluation.PRESENT:
        return this.colorGold;
      case Evaluation.ABSENT:
        return this.colorGrey;
      case Evaluation.UNKNOWN:
        return 'transparent';
      default:
        return 'rgb(109, 109, 109)';
    }
  }
}
