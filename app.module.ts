import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppComponent } from './app.component';
import { TranscriptionComponent } from './components/transcription/transcription.component';
import { AudioUploaderComponent } from './components/audio-uploader/audio-uploader.component';
import { TranscriptEditorComponent } from './components/transcript-editor/transcript-editor.component';
import { ModelSelectorComponent } from './components/model-selector/model-selector.component';
import { SettingsComponent } from './components/settings/settings.component';

// Services
import { ElectronService } from './services/electron.service';
import { TranscriptionService } from './services/transcription.service';
import { WebSocketService } from './services/websocket.service';

@NgModule({
  declarations: [
    AppComponent,
    TranscriptionComponent,
    AudioUploaderComponent,
    TranscriptEditorComponent,
    ModelSelectorComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    // Material Modules
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  providers: [
    ElectronService,
    TranscriptionService,
    WebSocketService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
