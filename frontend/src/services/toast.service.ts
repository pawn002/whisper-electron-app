import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(
    message: string,
    variant: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration = 3000,
  ): void {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    this.toastsSubject.next([...this.toastsSubject.value, { id, message, variant }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: string): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }
}
