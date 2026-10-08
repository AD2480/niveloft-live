/**
 * Voice for the assistant, using the browser's own speech recognition (Chrome, Edge, Safari) and
 * speech synthesis. Niveloft never receives audio, only the text the browser transcribes.
 *
 * Two ways to listen, never at the same time (browsers allow one recognition at a time):
 * - `listenOnce`: push-to-talk for one command, with interim text while speaking;
 * - wake mode: listens continuously for "Hey Flurry" while the tab is visible, and only when
 *   the person has turned it on. It pauses during `listenOnce` and resumes afterwards.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { readonly length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const voiceInputSupported = (): boolean => recognitionCtor() !== null;
export const voiceOutputSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Plain-language messages for the browser's recognition errors. */
export function voiceErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it for this site in the browser’s address bar, then try again.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'The browser’s speech service couldn’t be reached. Voice needs a network connection in most browsers.';
    case 'no-speech':
      return 'Nothing was heard. Try again, a little closer to the microphone.';
    case 'language-not-supported':
      return 'The browser can’t recognise speech in this language.';
    case 'unstable':
      return 'Listening for “Hey Flurry” stopped because the browser’s speech service kept ending. Turn it on again to retry.';
    default:
      return 'Voice input stopped unexpectedly. Try again.';
  }
}

const language = () => (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

export interface ListenHandlers {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
}

export class VoiceController {
  private once: Recognition | null = null;
  private wake: Recognition | null = null;
  private wakeWanted = false;
  private onceHandlers: ListenHandlers | null = null;
  private onWake: ((transcript: string) => void) | null = null;
  private onWakeError: ((code: string) => void) | null = null;
  private restartTimer = 0;
  private lastWakeStart = 0;
  /** Consecutive wake sessions that ended within seconds of starting (a failing speech service). */
  private quickEnds = 0;
  private disposed = true;
  /** Told whenever the wake listener actually starts or stops, so the UI shows what's really running. */
  onWakeActiveChange: ((active: boolean) => void) | null = null;

  /** Starts watching tab visibility (wake mode pauses in background tabs). Call before use; `dispose` undoes it. */
  attach(): void {
    if (!this.disposed) return;
    this.disposed = false;
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
  }

  get listening(): boolean {
    return this.once !== null;
  }

  /** Push-to-talk: one utterance. Returns false if voice isn't supported. */
  listenOnce(h: ListenHandlers): boolean {
    const Ctor = recognitionCtor();
    if (!Ctor) return false;
    this.stopOnce();
    this.pauseWake();
    const r = new Ctor();
    r.lang = language();
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim) h.onInterim?.(finalText + interim);
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted') h.onError?.(e.error);
    };
    r.onend = () => {
      if (this.once !== r) return; // replaced or stopped: its handlers were already told
      this.once = null;
      this.onceHandlers = null;
      const text = finalText.trim();
      if (text) h.onFinal(text);
      h.onEnd?.();
      this.resumeWake();
    };
    this.once = r;
    this.onceHandlers = h;
    try {
      r.start();
    } catch {
      this.once = null;
      h.onError?.('start-failed');
      this.resumeWake();
      return false;
    }
    return true;
  }

  /** Stops push-to-talk without sending anything (its `onEnd` is still called). */
  stopOnce(): void {
    if (!this.once) return;
    const r = this.once;
    const h = this.onceHandlers;
    this.once = null;
    this.onceHandlers = null;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try {
      r.abort();
    } catch {
      /* already stopped */
    }
    h?.onEnd?.();
    this.resumeWake();
  }

  /** Turns the "Hey Flurry" listener on or off. `onHeard` gets each final transcript. */
  setWake(enabled: boolean, onHeard?: (transcript: string) => void, onError?: (code: string) => void): void {
    this.wakeWanted = enabled && recognitionCtor() !== null;
    if (onHeard) this.onWake = onHeard;
    if (onError) this.onWakeError = onError;
    if (this.wakeWanted) this.startWake();
    else this.stopWake();
  }

  get wakeActive(): boolean {
    return this.wake !== null;
  }

  private startWake(): void {
    const Ctor = recognitionCtor();
    if (!Ctor || this.wake || this.once || this.disposed || !this.wakeWanted) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const r = new Ctor();
    r.lang = language();
    r.continuous = true;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) this.onWake?.(res[0].transcript);
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        this.wakeWanted = false; // don't keep asking; the person turns it back on
        this.onWakeError?.(e.error);
      }
    };
    r.onend = () => {
      if (this.wake === r) {
        this.wake = null;
        this.onWakeActiveChange?.(false);
      }
      // Browsers end continuous recognition after a while; restart, but never in a tight loop,
      // and give up (saying so) if the speech service keeps failing.
      const quick = Date.now() - this.lastWakeStart < 3000;
      this.quickEnds = quick ? this.quickEnds + 1 : 0;
      if (this.quickEnds >= 5) {
        this.wakeWanted = false;
        this.quickEnds = 0;
        this.onWakeError?.('unstable');
        return;
      }
      if (this.wakeWanted && !this.once) {
        window.clearTimeout(this.restartTimer);
        this.restartTimer = window.setTimeout(() => this.startWake(), quick ? 2000 * this.quickEnds : 250);
      }
    };
    this.wake = r;
    this.lastWakeStart = Date.now();
    try {
      r.start();
      this.onWakeActiveChange?.(true);
    } catch {
      this.wake = null;
    }
  }

  private stopWake(): void {
    window.clearTimeout(this.restartTimer);
    if (this.wake) {
      const r = this.wake;
      this.wake = null;
      r.onend = null;
      r.onresult = null;
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
      this.onWakeActiveChange?.(false);
    }
  }

  private pauseWake(): void {
    this.stopWake();
  }

  private resumeWake(): void {
    if (this.wakeWanted) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = window.setTimeout(() => this.startWake(), 300);
    }
  }

  // Nothing listens in a background tab: push-to-talk stops, the wake listener pauses.
  private onVisibility = () => {
    if (document.visibilityState === 'visible') this.resumeWake();
    else {
      this.stopOnce();
      this.stopWake();
    }
  };

  dispose(): void {
    this.disposed = true;
    this.wakeWanted = false;
    this.stopOnce();
    this.stopWake();
    stopSpeaking();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
  }
}

/** Reads text aloud with the browser's voice (if available). */
export function speak(text: string): void {
  if (!voiceOutputSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.length > 600 ? `${text.slice(0, 600)}…` : text);
  u.lang = language();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (voiceOutputSupported()) window.speechSynthesis.cancel();
}
