import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Evaluation, Tile } from 'src/app/interfaces/state';

@Component({
  selector: 'app-tile',
  templateUrl: './tile.component.html',
  styleUrls: ['./tile.component.scss'],
})
export class TileComponent implements OnInit {
  colorGold = '#b59f2b';
  colorGreen = '#538d3e';
  colorGrey = '#3a3a3c';

  @Input() text!: string;
  @Input() evaluation!: Evaluation | undefined;
  @Input() isKeyboard = false;
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
        return 'grey';
    }
  }
}
