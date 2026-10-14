let NativeSpeechModule: any = null;
try {
  // Dynamically require to avoid crash in Expo Go where native module is missing
  const speechPkg = require('expo-speech-recognition');
  NativeSpeechModule = speechPkg?.ExpoSpeechRecognitionModule || null;
} catch (e) {
  NativeSpeechModule = null;
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onPartialResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface SpeechPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable';
}

class SpeechRecognitionService {
  private activeSubscriptions: Array<{ remove: () => void }> = [];
  private isListeningActive = false;

  private getModule(): any {
    if (NativeSpeechModule) return NativeSpeechModule;
    try {
      const speechPkg = require('expo-speech-recognition');
      NativeSpeechModule = speechPkg?.ExpoSpeechRecognitionModule || null;
    } catch {
      NativeSpeechModule = null;
    }
    return NativeSpeechModule;
  }

  /**
   * Check if speech recognition is available on this platform/device.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const mod = this.getModule();
      if (!mod) return false;
      if (typeof mod.isRecognitionAvailable === 'function') {
        return await mod.isRecognitionAvailable();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Request microphone & speech recognition permissions.
   */
  async requestPermission(): Promise<SpeechPermissionStatus> {
    try {
      const mod = this.getModule();
      if (!mod || typeof mod.requestPermissionsAsync !== 'function') {
        return {
          granted: false,
          canAskAgain: false,
          status: 'unavailable',
        };
      }

      const res = await mod.requestPermissionsAsync();
      return {
        granted: !!res.granted,
        canAskAgain: res.canAskAgain ?? true,
        status: res.status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (err: any) {
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Query existing permission status without prompting.
   */
  async getPermissionStatus(): Promise<SpeechPermissionStatus> {
    try {
      const mod = this.getModule();
      if (!mod || typeof mod.getPermissionsAsync !== 'function') {
        return {
          granted: false,
          canAskAgain: false,
          status: 'unavailable',
        };
      }

      const res = await mod.getPermissionsAsync();
      return {
        granted: !!res.granted,
        canAskAgain: res.canAskAgain ?? true,
        status: res.status as 'granted' | 'denied' | 'undetermined',
      };
    } catch {
      return {
        granted: false,
        canAskAgain: false,
        status: 'unavailable',
      };
    }
  }

  /**
   * Start listening for voice input.
   * Attaches normalized callbacks for lifecycle events.
   */
  async startListening(callbacks: SpeechRecognitionCallbacks, lang = 'en-US'): Promise<void> {
    this.cleanSubscriptions();
    const mod = this.getModule();

    if (!mod) {
      callbacks.onError?.(
        'Speech recognition native module is not available in this runtime. An Expo Development Build is required.'
      );
      return;
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        callbacks.onError?.('Speech recognition is not available or supported on this device.');
        return;
      }

      // Subscribe to events
      const subStart = mod.addListener('start', () => {
        this.isListeningActive = true;
        callbacks.onStart?.();
      });

      const subResult = mod.addListener('result', (event: any) => {
        const transcript = event?.results?.[0]?.transcript?.trim() || '';
        if (event?.isFinal) {
          callbacks.onFinalResult?.(transcript);
        } else {
          callbacks.onPartialResult?.(transcript);
        }
      });

      const subError = mod.addListener('error', (event: any) => {
        this.isListeningActive = false;
        const rawCode = event?.error;
        let userMessage = 'Speech recognition encountered an issue. Please try again.';

        if (rawCode === 'no-speech') {
          userMessage = 'No speech detected. Please speak closer to the microphone and try again.';
        } else if (rawCode === 'not-allowed' || rawCode === 'permission-denied') {
          userMessage = 'Microphone permission was denied. Please grant permission in settings.';
        } else if (rawCode === 'network' || rawCode === 'network-timeout') {
          userMessage = 'Network error during speech recognition. Please check your connection.';
        } else if (rawCode === 'aborted') {
          userMessage = 'Listening was cancelled.';
        } else if (event?.message) {
          userMessage = event.message;
        }

        callbacks.onError?.(userMessage);
      });

      const subEnd = mod.addListener('end', () => {
        this.isListeningActive = false;
        callbacks.onEnd?.();
      });

      this.activeSubscriptions = [subStart, subResult, subError, subEnd];

      // Start native recognizer
      mod.start({
        lang,
        interimResults: true,
        continuous: false,
      });
    } catch (err: any) {
      this.isListeningActive = false;
      this.cleanSubscriptions();
      callbacks.onError?.(err?.message || 'Failed to start speech recognition.');
    }
  }

  /**
   * Stop listening and trigger final recognition result.
   */
  async stopListening(): Promise<void> {
    try {
      const mod = this.getModule();
      if (mod && typeof mod.stop === 'function') {
        mod.stop();
      }
    } catch {
      // ignore
    } finally {
      this.isListeningActive = false;
    }
  }

  /**
   * Cancel/abort listening immediately without waiting for final result.
   */
  async cancelListening(): Promise<void> {
    try {
      const mod = this.getModule();
      if (mod && typeof mod.abort === 'function') {
        mod.abort();
      }
    } catch {
      // ignore
    } finally {
      this.isListeningActive = false;
      this.cleanSubscriptions();
    }
  }

  get isListening(): boolean {
    return this.isListeningActive;
  }

  private cleanSubscriptions(): void {
    for (const sub of this.activeSubscriptions) {
      try {
        sub.remove();
      } catch {
        // ignore
      }
    }
    this.activeSubscriptions = [];
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
