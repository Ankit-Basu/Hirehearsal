'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Speech API dictation. Browsers stop recognition after a pause, so this restarts it while the
 * candidate still wants the mic on, and measures how long they actually spoke for words per minute.
 */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return recognitionConstructor() !== null;
}

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  speakingSeconds: () => number;
  reset: () => void;
}

/** Trailing silence that still counts as speaking, so short pauses do not inflate words per minute. */
const SPEECH_TAIL_MS = 1500;

export function useSpeechRecognition(
  lang: string,
  onFinalTranscript: (text: string) => void,
): UseSpeechRecognition {
  const [supported] = useState(() => sttSupported());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const onFinalRef = useRef(onFinalTranscript);
  const spokenMsRef = useRef(0);
  const firstResultRef = useRef<number | null>(null);
  const lastResultRef = useRef<number | null>(null);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const commitSpeechWindow = useCallback(() => {
    if (firstResultRef.current != null && lastResultRef.current != null) {
      spokenMsRef.current += lastResultRef.current - firstResultRef.current + SPEECH_TAIL_MS;
    }
    firstResultRef.current = null;
    lastResultRef.current = null;
  }, []);

  const createRecognition = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = event => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      const now = Date.now();
      firstResultRef.current ??= now;
      lastResultRef.current = now;

      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
        setInterim('');
      } else {
        setInterim(interimText);
      }
    };

    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      wantListeningRef.current = false;
      setListening(false);
      setError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access is blocked. Allow it in your browser settings, or type your answer.'
          : 'Speech recognition stopped unexpectedly. You can keep typing.',
      );
    };

    recognition.onend = () => {
      commitSpeechWindow();
      if (wantListeningRef.current) {
        // Browsers end the session after a pause; restart so long answers keep recording.
        setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            recognition.start();
          } catch {
            wantListeningRef.current = false;
            setListening(false);
          }
        }, 250);
      } else {
        setListening(false);
        setInterim('');
      }
    };

    return recognition;
  }, [commitSpeechWindow, lang]);

  const start = useCallback(() => {
    if (!supported || wantListeningRef.current) return;
    setError(null);
    const recognition = recognitionRef.current ?? createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition.lang = lang;
    wantListeningRef.current = true;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if a previous session is still closing; onend restarts it.
    }
  }, [createRecognition, lang, supported]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setListening(false);
    setInterim('');
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
  }, []);

  const speakingSeconds = useCallback(() => {
    const pending =
      firstResultRef.current != null && lastResultRef.current != null
        ? lastResultRef.current - firstResultRef.current + SPEECH_TAIL_MS
        : 0;
    return Math.round((spokenMsRef.current + pending) / 1000);
  }, []);

  const reset = useCallback(() => {
    spokenMsRef.current = 0;
    firstResultRef.current = null;
    lastResultRef.current = null;
    setInterim('');
  }, []);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignored.
      }
    };
  }, []);

  return { supported, listening, interim, error, start, stop, speakingSeconds, reset };
}
