import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
})
export class DialogComponent implements OnInit, AfterViewInit, OnDestroy {
  timeLeft: string | undefined;
  countdown$: Subscription | undefined;

  @ViewChild('chartcanvas')
  chartCanvas: ElementRef | undefined;

  private chart: Chart | undefined;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: dialogData,
    private readonly dialogRef: MatDialogRef<DialogComponent>
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.dialogRef.disableClose = true;
    setTimeout(() => (this.dialogRef.disableClose = false), 1000);
  }

  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
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

  initChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      return;
    }

    if (!this.data.wonsInTries) {
      return;
    }

    const data = this.data.wonsInTries
      .sort(function (a, b) {
        return b.tries - a.tries;
      })
      .reverse();

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map((x) => x.tries),
        datasets: [
          {
            data: data.map((x) => x.count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(255, 159, 64, 0.5)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },

      options: {
        indexAxis: 'y',
        responsive: false,
        scales: {
          y: {
            ticks: {
              stepSize: 1,
              autoSkip: false,
              color: 'white',
            },
          },
          x: {
            ticks: {
              stepSize: 1,
              autoSkip: true,
              color: 'white',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: function (_) {
                return [];
              },
              label: function (context) {
                let label = context.dataset.label || '';

                if (label) {
                  label += ': ';
                }

                if (context.parsed.y !== null) {
                  label += `${context.formattedValue} wega gana den ${context.label} purba.`;
                }

                return label;
              },
            },
          },
        },
      },
    });
  }
}

export interface dialogData {
  title: string;
  text: string;
  nextDay: number;
  copyText: string;
  totalGamesPlayed: number;
  totalGamesWon: number;
  totalGamesLost: number;
  currentStreak: number;
  maxStreak: number;
  wonsInTries: { tries: number; count: number }[];
}
