import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-dialog-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent implements AfterViewInit, OnDestroy {
  @Input() wonsInTries!: { tries: number; count: number }[];

  @ViewChild('chartcanvas')
  chartCanvas: ElementRef | undefined;

  private chart: Chart | undefined;

  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  initChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      return;
    }

    if (!this.wonsInTries) {
      return;
    }

    const data = this.wonsInTries
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
