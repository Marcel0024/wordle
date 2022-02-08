import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { filter, interval, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss'],
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input() countdownTime: number | undefined;
  @Output() countdownComplete = new EventEmitter<{ complete: boolean }>();

  timeleft: string = '00:00:00';

  ngUnsubscribe$ = new EventEmitter();

  constructor() {}

  ngOnInit(): void {
    if (this.countdownTime) {
      this.timeleft = this.getTimeDifference();
      interval(1000)
        .pipe(
          takeUntil(this.ngUnsubscribe$),
          tap((_) => (this.timeleft = this.getTimeDifference())),
          filter((_) => this.countdownTime! - new Date().valueOf() <= 0),
          tap((_) => this.countdownComplete.emit({ complete: true }))
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe$.emit();
  }

  getTimeDifference(): string {
    const timeDifference = this.countdownTime! - new Date().valueOf();
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
}
