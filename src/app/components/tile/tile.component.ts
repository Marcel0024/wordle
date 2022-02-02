import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Tile } from 'src/app/interfaces/state';

@Component({
  selector: 'app-tile',
  templateUrl: './tile.component.html',
  styleUrls: ['./tile.component.scss'],
})
export class TileComponent implements OnInit {
  @Input() text!: string;
  @Input() color: string = 'transparent';
  @Input() isKeyboard = false;

  @Output() onClick = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  clicked(): void {
    this.onClick.emit(this.text);
  }

  isLargeWord(): boolean {
    return this.text.length > 2;
  }
}
