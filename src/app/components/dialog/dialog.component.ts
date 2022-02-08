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
  timeleft: string = '00:00:00';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly snackBar: MatSnackBar,
    private readonly dialogRef: MatDialogRef<DialogComponent>
  ) {}

  displayedColumns: string[] = ['Hunga', 'Gana', 'Perde'];

  ngOnInit(): void {
    if (this.data.nextDay) {
      this.timeleft = this.getTimeDifference();
      this.countdown$ = interval(1000)
        .pipe(
          tap((_) => (this.timeleft = this.getTimeDifference())),
          filter((_) => this.data.nextDay - new Date().valueOf() <= 0),
          tap((_) => this.dialogRef.close())
        )
        .subscribe();
    }

    this.dialogRef.disableClose = true;
    setTimeout(() => (this.dialogRef.disableClose = false), 1000);
  }

  getTimeDifference(): string {
    const timeDifference = this.data.nextDay - new Date().valueOf();
    return this.allocateTimeUnits(timeDifference);
  }

  allocateTimeUnits(timeDifference: number): string {
    const secondsToDday = Math.floor((timeDifference / 1000) % 60).toString();
    const minutesToDday = Math.floor(
      (timeDifference / (1000 * 60)) % 60
    ).toString();
    const hoursToDday = Math.floor(
      (timeDifference / (1000 * 60 * 60)) % 24
    ).toString();

    return `${hoursToDday.length === 1 ? '0' + hoursToDday : hoursToDday}:${
      minutesToDday.length === 1 ? '0' + minutesToDday : minutesToDday
    }:${secondsToDday.length === 1 ? '0' + secondsToDday : secondsToDday}`;
  }

  copy(): void {
    navigator.clipboard.writeText(this.data.copyText);

    this.snackBar.open('Copied to clipboard!');
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
