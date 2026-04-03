import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HistoryComponent } from './history.component';
import { ElectronService } from '../../services/electron.service';
import { ToastService } from '../../services/toast.service';

const electronStub: Partial<ElectronService> = {
  getTranscriptionHistory: jest.fn().mockResolvedValue([]),
  onTranscriptionCompleted: jest.fn(),
  onTranscriptionError: jest.fn(),
  removeAllListeners: jest.fn(),
};

const toastStub: Partial<ToastService> = {
  show: jest.fn(),
};

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, HistoryComponent],
      providers: [
        { provide: ElectronService, useValue: electronStub },
        { provide: ToastService, useValue: toastStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── formatDuration ───────────────────────────────────────────────────────

  describe('formatDuration()', () => {
    it('returns "N/A" for undefined', () => {
      expect(component.formatDuration(undefined)).toBe('N/A');
    });

    it('returns "N/A" for 0', () => {
      expect(component.formatDuration(0)).toBe('N/A');
    });

    it('formats seconds correctly', () => {
      expect(component.formatDuration(90)).toBe('1:30');
    });

    it('zero-pads seconds below 10', () => {
      expect(component.formatDuration(65)).toBe('1:05');
    });
  });

  // ─── formatTime ───────────────────────────────────────────────────────────

  describe('formatTime()', () => {
    it('returns "N/A" for undefined', () => {
      expect(component.formatTime(undefined)).toBe('N/A');
    });

    it('shows milliseconds for sub-second durations', () => {
      expect(component.formatTime(500)).toBe('500ms');
    });

    it('shows seconds for durations over 1000ms', () => {
      expect(component.formatTime(2500)).toBe('2.5s');
    });
  });

  // ─── getStatusVariant ─────────────────────────────────────────────────────

  describe('getStatusVariant()', () => {
    it('maps "completed" to "success"', () => {
      expect(component.getStatusVariant('completed')).toBe('success');
    });

    it('maps "failed" to "error"', () => {
      expect(component.getStatusVariant('failed')).toBe('error');
    });

    it('maps "processing" to "primary"', () => {
      expect(component.getStatusVariant('processing')).toBe('primary');
    });

    it('maps unknown status to empty string', () => {
      expect(component.getStatusVariant('unknown')).toBe('');
    });
  });
});
