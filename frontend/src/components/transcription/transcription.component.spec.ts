import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranscriptionComponent } from './transcription.component';
import { ElectronService } from '../../services/electron.service';
import { ToastService } from '../../services/toast.service';

const electronStub = {
  getAvailableModels: jest.fn().mockResolvedValue([]),
  onTranscriptionProgress: jest.fn(),
  onTranscriptionCompleted: jest.fn(),
  onTranscriptionError: jest.fn(),
  selectAudioFile: jest.fn(),
  transcribeAudio: jest.fn(),
};

const toastStub = {
  show: jest.fn(),
};

describe('TranscriptionComponent', () => {
  let component: TranscriptionComponent;
  let fixture: ComponentFixture<TranscriptionComponent>;

  beforeEach(async () => {
    jest.clearAllMocks();
    electronStub.getAvailableModels.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      declarations: [TranscriptionComponent],
      imports: [FormsModule],
      providers: [
        { provide: ElectronService, useValue: electronStub },
        { provide: ToastService, useValue: toastStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TranscriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── formatFileSize ───────────────────────────────────────────────────────

  describe('formatFileSize()', () => {
    it('returns "0 Bytes" for 0', () => {
      expect(component.formatFileSize(0)).toBe('0 Bytes');
    });

    it('converts bytes to KB', () => {
      expect(component.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('converts bytes to MB', () => {
      expect(component.formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('converts bytes to GB', () => {
      expect(component.formatFileSize(1610612736)).toBe('1.5 GB');
    });
  });

  // ─── getFileName ─────────────────────────────────────────────────────────

  describe('getFileName()', () => {
    it('returns empty string when no file selected', () => {
      component.selectedFilePath = null;
      expect(component.getFileName()).toBe('');
    });

    it('extracts filename from Unix path', () => {
      component.selectedFilePath = '/home/user/audio/recording.mp3';
      expect(component.getFileName()).toBe('recording.mp3');
    });

    it('extracts filename from Windows path', () => {
      component.selectedFilePath = 'C:\\Users\\user\\audio\\recording.mp3';
      expect(component.getFileName()).toBe('recording.mp3');
    });
  });

  // ─── getTranscriptionText ─────────────────────────────────────────────────

  describe('getTranscriptionText()', () => {
    it('returns empty string when no result', () => {
      component.transcriptionResult = null;
      expect(component.getTranscriptionText()).toBe('');
    });

    it('returns string result directly (backward-compat branch)', () => {
      component.transcriptionResult = 'plain text transcript';
      expect(component.getTranscriptionText()).toBe('plain text transcript');
    });

    it('returns text property from object result', () => {
      component.transcriptionResult = { text: 'object transcript' };
      expect(component.getTranscriptionText()).toBe('object transcript');
    });

    it('formats segments as timestamped text', () => {
      component.transcriptionResult = {
        segments: [
          { start: 0, end: 1.5, text: 'Hello' },
          { start: 1.5, end: 3, text: 'world' },
        ],
      };
      const result = component.getTranscriptionText();
      expect(result).toContain('[00:00:00.000 --> 00:00:01.500] Hello');
      expect(result).toContain('[00:00:01.500 --> 00:00:03.000] world');
    });
  });

  // ─── resetUI via selectAudioFile ──────────────────────────────────────────

  it('resets UI state when a new file is selected', async () => {
    component.transcriptionResult = { text: 'old result' };
    component.isTranscribing = true;
    component.transcriptionProgress = 80;
    electronStub.selectAudioFile.mockResolvedValue({ path: '/audio/new.mp3', size: 1024 });

    await component.selectAudioFile();

    expect(component.transcriptionResult).toBeNull();
    expect(component.isTranscribing).toBe(false);
    expect(component.transcriptionProgress).toBe(0);
  });

  // ─── startTranscription guard ─────────────────────────────────────────────

  it('shows a toast and returns early when no file is selected', async () => {
    component.selectedFilePath = null;

    await component.startTranscription();

    expect(toastStub.show).toHaveBeenCalledWith('Please select an audio file', 'info', 3000);
    expect(component.isTranscribing).toBe(false);
  });
});
