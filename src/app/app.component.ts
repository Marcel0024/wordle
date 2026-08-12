import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Evaluation, Tile } from './game.models';
import { GameStore } from './game.store';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly store = inject(GameStore);
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('modal');
  private readonly now = signal(Date.now());

  readonly keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'Ñ', 'M'],
  ];

  readonly winRate = computed(() => {
    const stats = this.store.stats();
    return stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
  });

  readonly maxDistribution = computed(() => Math.max(1, ...this.store.stats().distribution));

  readonly countdown = computed(() => {
    const remaining = Math.max(0, this.store.game().nextDay - this.now());
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1_000);
    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
  });

  constructor() {
    this.analytics.initialize();
    const removeVideoWorkaround = this.startVideoWorkaround();
    const interval = window.setInterval(() => {
      this.now.set(Date.now());
      if (Date.now() >= this.store.game().nextDay) this.store.rollover();
    }, 1_000);
    const reloadTimer = window.setTimeout(() => location.reload(), 86_400_000 * 2);
    this.destroyRef.onDestroy(() => {
      window.clearInterval(interval);
      window.clearTimeout(reloadTimer);
      removeVideoWorkaround();
    });

    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  @HostListener('document:keydown', ['$event'])
  onPhysicalKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.store.modal()) {
      event.preventDefault();
      this.closeModal();
      return;
    }
    if (this.store.modal()) return;
    const key = event.key.toUpperCase();
    if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-ZÑ]$/.test(key)) {
      event.preventDefault();
      this.store.input(key);
    }
  }

  tileClass(evaluation: Evaluation, filled: boolean): string {
    if (evaluation === 'correct') return 'tile-correct';
    if (evaluation === 'present') return 'tile-present';
    if (evaluation === 'absent') return 'tile-absent';
    return filled
      ? 'border-ocean bg-white text-ink shadow-[0_3px_0_#075985]'
      : 'border-mist bg-white/70 text-ink';
  }

  keyClass(key: string): string {
    const evaluation = this.store.keyboardEvaluations().get(key);
    if (evaluation === 'correct') return 'bg-lagoon text-white border-lagoon-dark';
    if (evaluation === 'present') return 'bg-gold text-ink border-gold-dark';
    if (evaluation === 'absent') return 'bg-slate text-white border-slate-dark';
    return 'bg-white text-ink border-mist hover:border-ocean hover:bg-sky';
  }

  tileLabel(tile: Tile, rowIndex: number, tileIndex: number): string {
    const status = {
      unknown: tile.letter ? 'no evalua ainda' : 'bashí',
      correct: 'letter corecto na e posicion corecto',
      present: 'letter corecto na un otro posicion',
      absent: 'letter no ta den e palabra',
    }[tile.evaluation];
    return `Rei ${rowIndex + 1}, letter ${tileIndex + 1}: ${tile.letter || status}${tile.letter ? `, ${status}` : ''}`;
  }

  distributionWidth(value: number): number {
    return Math.max(value === 0 ? 7 : 14, Math.round((value / this.maxDistribution()) * 100));
  }

  closeModal(): void {
    this.dialog()?.nativeElement.close();
    this.store.closeModal();
  }

  onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  async share(): Promise<void> {
    const text = this.store.shareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wordle Papiamento', text });
        this.store.notify('Resultado compartí.');
      } else {
        await navigator.clipboard.writeText(text);
        this.store.notify('Resultado copia.');
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        this.store.notify('No por a comparti. Purba atrobe.');
      }
    }
  }

  private startVideoWorkaround(): () => void {
    try {
      const video = document.createElement('video');
      video.loop = true;
      video.style.position = 'fixed';
      video.style.pointerEvents = 'none';
      video.setAttribute('aria-hidden', 'true');
      const source = document.createElement('source');
      source.type = 'video/webm';
      source.src =
        'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=';
      video.appendChild(source);
      document.body.appendChild(video);

      const play = (): void => {
        void video.play().catch(() => undefined);
        document.body.removeEventListener('touchend', play);
      };
      document.body.addEventListener('touchend', play);
      return () => {
        document.body.removeEventListener('touchend', play);
        video.remove();
      };
    } catch {
      return () => undefined;
    }
  }
}
