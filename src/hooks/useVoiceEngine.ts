import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTurnSpeechMetrics, type SpeechTurnMetrics } from '../utils/voiceMetrics';

export type VoiceEngineState = 'idle' | 'speaking' | 'listening' | 'processing';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface UseVoiceEngineOptions {
  pauseThresholdMs?: number;
  saveRawAudio?: boolean;
  onAutoSubmit?: (transcript: string, metrics: SpeechTurnMetrics, hasAudio: boolean) => void;
  onNoSpeech?: () => void;
}

const DEFAULT_WAVEFORM = Array.from({ length: 18 }, () => 0.12);

export function useVoiceEngine(options: UseVoiceEngineOptions = {}) {
  const pauseThresholdMs = options.pauseThresholdMs ?? 1800;

  const [engineState, setEngineState] = useState<VoiceEngineState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [waveform, setWaveform] = useState<number[]>(DEFAULT_WAVEFORM);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceError, setVoiceError] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const onAutoSubmitRef = useRef(options.onAutoSubmit);
  const onNoSpeechRef = useRef(options.onNoSpeech);
  const saveRawAudioRef = useRef(Boolean(options.saveRawAudio));
  useEffect(() => {
    onAutoSubmitRef.current = options.onAutoSubmit;
    onNoSpeechRef.current = options.onNoSpeech;
    saveRawAudioRef.current = Boolean(options.saveRawAudio);
  }, [options.onAutoSubmit, options.onNoSpeech, options.saveRawAudio]);

  // Live capture refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Timing & speech metrics refs
  const turnStartMsRef = useRef<number>(0);
  const lastVoiceMsRef = useRef<number>(0);
  const silenceStartMsRef = useRef<number | null>(null);
  const pauseDurationsRef = useRef<number[]>([]);
  const rmsSamplesRef = useRef<number[]>([]);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const listeningActiveRef = useRef(false);
  const pausedRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const noSpeechWarnedRef = useRef(false);

  const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  };

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stopAudioPipeline = useCallback(() => {
    listeningActiveRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors on unmounted recognition
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore recorder stop errors
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setWaveform(DEFAULT_WAVEFORM);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis cancel errors
      }
    }
  }, []);

  const buildCurrentMetrics = useCallback(
    (overrideTranscript?: string): SpeechTurnMetrics => {
      const combined = (
        overrideTranscript ?? `${finalTranscriptRef.current} ${interimTranscriptRef.current}`
      ).trim();
      const durationSec = Math.max(1, (Date.now() - turnStartMsRef.current) / 1000);
      return computeTurnSpeechMetrics({
        transcript: combined,
        durationSeconds: durationSec,
        pauseDurationsMs: pauseDurationsRef.current,
        rmsSamples: rmsSamplesRef.current,
      });
    },
    []
  );

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    pauseDurationsRef.current = [];
    rmsSamplesRef.current = [];
    silenceStartMsRef.current = null;
    autoSubmittedRef.current = false;
    noSpeechWarnedRef.current = false;
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(async () => {
    stopSpeaking();
    stopAudioPipeline();
    setVoiceError('');
    setIsPaused(false);
    pausedRef.current = false;
    autoSubmittedRef.current = false;
    noSpeechWarnedRef.current = false;
    turnStartMsRef.current = Date.now();
    lastVoiceMsRef.current = Date.now();
    silenceStartMsRef.current = null;
    pauseDurationsRef.current = [];
    rmsSamplesRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission('denied');
      setVoiceError(
        'Microphone API is unavailable in this browser context. You can type your response below.'
      );
      setEngineState('idle');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setMicPermission('granted');

      // Optional raw audio opt-in (local only)
      if (saveRawAudioRef.current && typeof MediaRecorder !== 'undefined') {
        try {
          audioChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
          };
          recorder.onstop = () => {
            if (audioChunksRef.current.length > 0) {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const url = URL.createObjectURL(blob);
              setRecordedAudioUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
              });
            }
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch {
          // Optional local recording failed silently; transcription still continues
        }
      }

      // Web Audio Analyser for real-time waveform + VAD
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      // Web Speech Recognition
      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        setSpeechSupported(true);
        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: SpeechRecognitionEventLike) => {
          let addedFinal = '';
          let nextInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const res = event.results[i];
            const piece = res[0]?.transcript ?? '';
            if (res.isFinal) {
              addedFinal += `${piece} `;
            } else {
              nextInterim += piece;
            }
          }
          if (addedFinal.trim()) {
            const updatedFinal = `${finalTranscriptRef.current} ${addedFinal}`.trim();
            finalTranscriptRef.current = updatedFinal;
            setFinalTranscript(updatedFinal);
            lastVoiceMsRef.current = Date.now();
            silenceStartMsRef.current = null;
          }
          interimTranscriptRef.current = nextInterim.trim();
          setInterimTranscript(interimTranscriptRef.current);
          if (nextInterim.trim()) {
            lastVoiceMsRef.current = Date.now();
            silenceStartMsRef.current = null;
          }
        };

        rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
          if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
            setMicPermission('denied');
            setVoiceError(
              'Microphone permission was blocked. Please allow microphone access or type your answer below.'
            );
            stopAudioPipeline();
            setEngineState('idle');
          } else if (ev.error === 'no-speech') {
            if (!finalTranscriptRef.current && !noSpeechWarnedRef.current) {
              noSpeechWarnedRef.current = true;
              setVoiceError("I didn't catch that, please repeat.");
              onNoSpeechRef.current?.();
            }
          } else if (ev.error === 'network') {
            setVoiceError('Speech recognition network error. You can retry or type your answer below.');
          }
        };

        rec.onend = () => {
          if (listeningActiveRef.current && !pausedRef.current && !autoSubmittedRef.current) {
            try {
              rec.start();
            } catch {
              // Ignore restart race
            }
          }
        };

        recognitionRef.current = rec;
        try {
          rec.start();
        } catch {
          // Ignore duplicate start
        }
      } else {
        setSpeechSupported(false);
        setVoiceError(
          'Live browser speech-to-text is not supported in this browser. Microphone waveform is active—please type your answer below.'
        );
      }

      listeningActiveRef.current = true;
      setEngineState('listening');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!listeningActiveRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute 18 smooth waveform bars + RMS proxy
        const bars: number[] = [];
        let sum = 0;
        const stride = Math.max(1, Math.floor(dataArray.length / 18));
        for (let i = 0; i < 18; i += 1) {
          const val = (dataArray[Math.min(dataArray.length - 1, i * stride)] ?? 0) / 255;
          bars.push(Math.max(0.1, Number(val.toFixed(2))));
          sum += val;
        }
        setWaveform(bars);

        const avgAmp = sum / 18;
        rmsSamplesRef.current.push(avgAmp);
        if (rmsSamplesRef.current.length > 250) {
          rmsSamplesRef.current.shift();
        }

        const now = Date.now();
        if (!pausedRef.current) {
          if (avgAmp > 0.08) {
            if (silenceStartMsRef.current !== null) {
              const gap = now - silenceStartMsRef.current;
              if (gap >= 500) {
                pauseDurationsRef.current.push(gap);
              }
              silenceStartMsRef.current = null;
            }
            lastVoiceMsRef.current = now;
          } else {
            if (silenceStartMsRef.current === null) {
              silenceStartMsRef.current = now;
            }
            const combinedText =
              `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
            const silentMs = now - lastVoiceMsRef.current;

            if (combinedText.length > 4 && silentMs >= pauseThresholdMs && !autoSubmittedRef.current) {
              autoSubmittedRef.current = true;
              const metrics = buildCurrentMetrics(combinedText);
              const hasAudio = saveRawAudioRef.current;
              stopAudioPipeline();
              setEngineState('processing');
              onAutoSubmitRef.current?.(combinedText, metrics, hasAudio);
              return;
            }

            if (!combinedText && now - turnStartMsRef.current > 9000 && !noSpeechWarnedRef.current) {
              noSpeechWarnedRef.current = true;
              setVoiceError("I didn't catch that, please repeat.");
              onNoSpeechRef.current?.();
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/denied|notallowed|permission/i.test(msg)) {
        setMicPermission('denied');
        setVoiceError(
          'Microphone access was blocked. Allow microphone permission in your browser settings or type your answer below.'
        );
      } else {
        setVoiceError(
          'Could not initialize microphone input. You can still type your response below.'
        );
      }
      setEngineState('idle');
      return false;
    }
  }, [buildCurrentMetrics, pauseThresholdMs, stopAudioPipeline, stopSpeaking]);

  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      stopSpeaking();
      stopAudioPipeline();
      setVoiceError('');
      setEngineState('speaking');

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setEngineState('idle');
        onDone?.();
        return;
      }

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        setEngineState('idle');
        onDone?.();
      };

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith('en') && /natural|google|samantha/i.test(v.name)) ??
          voices.find((v) => v.lang.startsWith('en'));
        if (preferred) {
          utterance.voice = preferred;
        }
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);

        // Fallback safety timer in case browser speechSynthesis stalls or has 0 audio devices
        const estDurationMs = Math.max(2500, Math.min(12000, text.split(/\s+/).length * 420));
        window.setTimeout(() => {
          if (!finished && !window.speechSynthesis.speaking) {
            finish();
          }
        }, estDurationMs);
      } catch {
        finish();
      }
    },
    [stopAudioPipeline, stopSpeaking]
  );

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      pausedRef.current = next;
      if (next) {
        try {
          recognitionRef.current?.stop();
        } catch {
          // Ignore
        }
      } else {
        lastVoiceMsRef.current = Date.now();
        silenceStartMsRef.current = null;
        try {
          recognitionRef.current?.start();
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopAudioPipeline();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl, stopAudioPipeline, stopSpeaking]);

  return {
    engineState,
    setEngineState,
    isPaused,
    togglePause,
    finalTranscript,
    interimTranscript,
    setFinalTranscript: (val: string) => {
      finalTranscriptRef.current = val;
      setFinalTranscript(val);
    },
    resetTranscript,
    waveform,
    micPermission,
    speechSupported,
    voiceError,
    setVoiceError,
    recordedAudioUrl,
    speakText,
    stopSpeaking,
    startListening,
    stopAudioPipeline,
    buildCurrentMetrics,
  };
}
