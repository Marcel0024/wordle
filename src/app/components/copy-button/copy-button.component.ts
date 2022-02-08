import { Component, Input } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-copy-button',
  templateUrl: './copy-button.component.html',
  styleUrls: ['./copy-button.component.scss'],
})
export class CopyButtonComponent {
  @Input() text: string | undefined;

  constructor(private readonly snackBar: MatSnackBar) {}

  copy(): void {
    if (!this.text) {
      return;
    }

    navigator.clipboard.writeText(this.text);
    this.snackBar.open('Copied to clipboard!');
  }
}
