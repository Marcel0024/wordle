import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environments/environment';

type AnalyticsParameters = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...arguments_: unknown[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private initialized = false;

  initialize(): void {
    if (this.initialized || !this.isEnabled()) return;

    this.initialized = true;
    window.dataLayer ??= [];
    window.gtag = function (): void {
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', environment.ga);

    if (!this.document.getElementById('google-tag')) {
      const script = this.document.createElement('script');
      script.id = 'google-tag';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(environment.ga)}`;
      this.document.head.appendChild(script);
    }
  }

  trackEvent(name: string, parameters: AnalyticsParameters = {}): void {
    if (!this.isEnabled()) return;
    this.initialize();
    window.gtag?.('event', name, parameters);
  }

  private isEnabled(): boolean {
    return environment.production && environment.ga.startsWith('G-');
  }
}
