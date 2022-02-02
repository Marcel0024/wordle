import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss'],
})
export class KeyboardComponent implements OnInit {
  @Input() rows!: string[][];
  @Output() onClick = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  letterClicked(letter: string): void {
    this.onClick.emit(letter);
  }
}
