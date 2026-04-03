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
  saveTranscript: jest.fn(),
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

  // ─── setTranscriptionText ────────────────────────────────────────────────

  describe('setTranscriptionText()', () => {
    it('replaces the result directly when it is a string', () => {
      component.transcriptionResult = 'original';
      component.setTranscriptionText('updated');
      expect(component.transcriptionResult).toBe('updated');
    });

    it('sets the text property when result is an object', () => {
      component.transcriptionResult = { text: 'original', segments: [] };
      component.setTranscriptionText('updated');
      expect(component.transcriptionResult.text).toBe('updated');
    });
  });

  // ─── loadAvailableModels ──────────────────────────────────────────────────

  describe('loadAvailableModels()', () => {
    it('filters to only installed models', async () => {
      electronStub.getAvailableModels.mockResolvedValue([
        { name: 'base', size: '74 MB', installed: true },
        { name: 'small', size: '244 MB', installed: false },
      ]);

      await component.loadAvailableModels();

      expect(component.availableModels.length).toBe(1);
      expect(component.availableModels[0].id).toBe('base');
    });

    it('keeps the current model selection when it is still available', async () => {
      component.selectedModel = 'base';
      electronStub.getAvailableModels.mockResolvedValue([
        { name: 'base', size: '74 MB', installed: true },
        { name: 'small', size: '244 MB', installed: true },
      ]);

      await component.loadAvailableModels();

      expect(component.selectedModel).toBe('base');
    });

    it('falls back to the first available model when current selection is not installed', async () => {
      component.selectedModel = 'large';
      electronStub.getAvailableModels.mockResolvedValue([
        { name: 'base', size: '74 MB', installed: true },
      ]);

      await component.loadAvailableModels();

      expect(component.selectedModel).toBe('base');
    });
  });

  // ─── saveTranscript ───────────────────────────────────────────────────────

  describe('saveTranscript()', () => {
    it('shows info toast and does not call electron when there is no result', async () => {
      component.transcriptionResult = null;

      await component.saveTranscript();

      expect(electronStub.saveTranscript).not.toHaveBeenCalled();
      expect(toastStub.show).toHaveBeenCalledWith('No transcript to save', 'info', 3000);
    });

    it('shows success toast with the saved path on success', async () => {
      component.transcriptionResult = { text: 'hello' };
      electronStub.saveTranscript.mockResolvedValue('/output/transcript.txt');

      await component.saveTranscript();

      expect(toastStub.show).toHaveBeenCalledWith(
        expect.stringContaining('/output/transcript.txt'),
        'success',
        5000,
      );
    });

    it('shows error toast when saving fails', async () => {
      component.transcriptionResult = { text: 'hello' };
      electronStub.saveTranscript.mockRejectedValue(new Error('disk full'));

      await component.saveTranscript();

      expect(toastStub.show).toHaveBeenCalledWith('Failed to save transcript', 'error', 3000);
    });
  });

  // ─── timestamp edge case ──────────────────────────────────────────────────

  it('formats segment timestamps spanning over an hour', () => {
    component.transcriptionResult = {
      segments: [{ start: 3661, end: 3662, text: 'Late segment' }],
    };

    const result = component.getTranscriptionText();

    expect(result).toContain('[01:01:01.000 --> 01:01:02.000] Late segment');
  });

  // ─── IPC callbacks registered in ngOnInit ────────────────────────────────
  //
  // These callbacks are closures registered at startup via window.electronAPI
  // and electronService.onTranscriptionProgress. To capture them we must mock
  // the registration points BEFORE fixture.detectChanges() triggers ngOnInit,
  // so we re-create the component in a nested beforeEach.

  describe('IPC callbacks registered in ngOnInit', () => {
    let completedCallback: (result: any) => void;
    let errorCallback: (error: string) => void;
    let progressCallback: (data: { progress: number; message?: string }) => void;

    beforeEach(() => {
      // Capture the callback passed to electronService.onTranscriptionProgress
      electronStub.onTranscriptionProgress.mockImplementation((cb: any) => {
        progressCallback = cb;
      });

      // Capture completion/error callbacks registered directly on window.electronAPI
      (window as any).electronAPI = {
        onTranscriptionCompleted: (cb: any) => { completedCallback = cb; },
        onTranscriptionError: (cb: any) => { errorCallback = cb; },
      };

      // Re-create so ngOnInit fires with the mocks above in place
      fixture = TestBed.createComponent(TranscriptionComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    afterEach(() => {
      delete (window as any).electronAPI;
    });

    // onTranscriptionProgress ──────────────────────────────────────────────

    describe('onTranscriptionProgress', () => {
      it('updates transcriptionProgress', () => {
        progressCallback({ progress: 42 });
        expect(component.transcriptionProgress).toBe(42);
      });

      it('updates progressMessage', () => {
        progressCallback({ progress: 50, message: 'Loading model...' });
        expect(component.progressMessage).toBe('Loading model...');
      });

      it('defaults progressMessage to empty string when message is absent', () => {
        progressCallback({ progress: 10 });
        expect(component.progressMessage).toBe('');
      });
    });

    // onTranscriptionCompleted ─────────────────────────────────────────────

    describe('onTranscriptionCompleted', () => {
      it('sets transcriptionResult from the payload', () => {
        completedCallback({ text: 'hello world' });
        expect(component.transcriptionResult).toEqual({ text: 'hello world' });
      });

      it('clears isTranscribing', () => {
        component.isTranscribing = true;
        completedCallback({ text: 'done' });
        expect(component.isTranscribing).toBe(false);
      });

      it('sets transcriptionProgress to 100', () => {
        component.transcriptionProgress = 50;
        completedCallback({ text: 'done' });
        expect(component.transcriptionProgress).toBe(100);
      });

      it('shows a success toast', () => {
        completedCallback({ text: 'done' });
        expect(toastStub.show).toHaveBeenCalledWith('Transcription completed!', 'success', 3000);
      });
    });

    // onTranscriptionError ─────────────────────────────────────────────────

    describe('onTranscriptionError', () => {
      it('clears isTranscribing', () => {
        component.isTranscribing = true;
        errorCallback('Something failed');
        expect(component.isTranscribing).toBe(false);
      });

      it('resets transcriptionProgress to 0', () => {
        component.transcriptionProgress = 75;
        errorCallback('Something failed');
        expect(component.transcriptionProgress).toBe(0);
      });

      it('shows the error message in a toast', () => {
        errorCallback('Whisper binary not found');
        expect(toastStub.show).toHaveBeenCalledWith('Whisper binary not found', 'error', 5000);
      });

      it('falls back to a default message when the error string is falsy', () => {
        errorCallback('');
        expect(toastStub.show).toHaveBeenCalledWith('Transcription failed', 'error', 5000);
      });
    });
  });
});
