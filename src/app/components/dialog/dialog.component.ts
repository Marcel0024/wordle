import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, interval, Subscription, tap } from 'rxjs';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
})
export class DialogComponent implements OnInit {
  timeLeft: string | undefined;
  countdown$: Subscription | undefined;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly snackBar: MatSnackBar,
    private readonly dialogRef: MatDialogRef<DialogComponent>
  ) {}

  displayedColumns: string[] = ['Hunga', 'Gana', 'Perde'];

  ngOnInit(): void {
    this.dialogRef.disableClose = true;
    setTimeout(() => (this.dialogRef.disableClose = false), 1000);
  }

  countdown(data: { complete: boolean }): void {
    if (data.complete) {
      this.dialogRef.close();
    }
  }

  tableSource(): any[] {
    return [
      {
        totalGamesPlayed: this.data.totalGamesPlayed,
        totalGamesWon: this.data.totalGamesWon,
        totalGamesLost: this.data.totalGamesLost,
      },
    ];
  }
}
