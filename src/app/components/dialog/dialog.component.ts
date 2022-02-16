import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
})
export class DialogComponent implements OnInit {
  timeLeft: string | undefined;
  countdown$: Subscription | undefined;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: any,
    private readonly dialogRef: MatDialogRef<DialogComponent>
  ) {}

  ngOnInit(): void {
    this.dialogRef.disableClose = true;
    setTimeout(() => (this.dialogRef.disableClose = false), 1000);
  }

  countdown(data: { complete: boolean }): void {
    if (data.complete) {
      this.dialogRef.close();
    }
  }

  percentageGameWon(): string {
    const percent =
      (100 * this.data.totalGamesWon) / this.data.totalGamesPlayed;

    if (isNaN(percent)) {
      return '0';
    }

    return percent.toFixed(0);
  }
}
