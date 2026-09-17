/**
 * Text to speech for Ora's questions and feedback.
 *
 * Browsers cut long utterances short (Chrome stops at roughly fifteen seconds), so text is split into
 * sentence-sized utterances and queued, with a keep-alive resume while speaking.
 */

export interface SpeakOptions {
  voiceURI?: string | null;
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface SpeechHandle {
  done: Promise<void>;
  cancel: () => void;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Voices load asynchronously in most browsers. */
export function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length > 0) {
    return Promise.resolve(existing);
  }
  return new Promise(resolve => {
    const finish = () => {
      synth.removeEventListener('voiceschanged', finish);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener('voiceschanged', finish);
  });
}

const PREFERRED = ['natural', 'google', 'samantha', 'aria', 'jenny', 'sonia', 'libby', 'daniel'];

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI?: string | null,
  lang = 'en',
): SpeechSynthesisVoice | undefined {
  if (voiceURI) {
    const exact = voices.find(voice => voice.voiceURI === voiceURI);
    if (exact) return exact;
  }
  const matching = voices.filter(voice => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const pool = matching.length > 0 ? matching : voices;
  const preferred = pool.find(voice => PREFERRED.some(name => voice.name.toLowerCase().includes(name)));
  return preferred ?? pool[0];
}

export function stopSpeaking(): void {
  if (ttsSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** Splits text into utterance-sized chunks that end on sentence boundaries where possible. */
export function chunkText(text: string, maxLength = 180): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (const piece of sentence.match(new RegExp(`.{1,${maxLength}}(\\s|$)`, 'g')) ?? [sentence]) {
        chunks.push(piece.trim());
      }
      continue;
    }
    if ((current ? `${current} ${sentence}` : sentence).length > maxLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks.filter(chunk => chunk.length > 0);
}

export function speak(text: string, options: SpeakOptions = {}): SpeechHandle {
  if (!ttsSupported() || !text.trim()) {
    options.onEnd?.();
    return { done: Promise.resolve(), cancel: () => {} };
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  let cancelled = false;
  let started = false;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const done = new Promise<void>(resolve => {
    const chunks = chunkText(text);
    const voices = synth.getVoices();
    const voice = pickVoice(voices, options.voiceURI, options.lang);

    const finish = () => {
      if (keepAlive) clearInterval(keepAlive);
      options.onEnd?.();
      resolve();
    };

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else if (options.lang) {
        utterance.lang = options.lang;
      }

      utterance.onstart = () => {
        if (!started && !cancelled) {
          started = true;
          options.onStart?.();
        }
      };
      if (index === chunks.length - 1) {
        utterance.onend = () => {
          if (!cancelled) finish();
        };
      }
      utterance.onerror = event => {
        // "interrupted" and "canceled" are expected when the candidate skips ahead.
        if (!cancelled && event.error !== 'interrupted' && event.error !== 'canceled') {
          finish();
        }
      };

      synth.speak(utterance);
    });

    // Chrome pauses long queues; a periodic resume keeps them flowing.
    keepAlive = setInterval(() => {
      if (!synth.speaking) return;
      synth.resume();
    }, 8000);
  });

  return {
    done,
    cancel: () => {
      cancelled = true;
      if (keepAlive) clearInterval(keepAlive);
      synth.cancel();
      options.onEnd?.();
    },
  };
}
