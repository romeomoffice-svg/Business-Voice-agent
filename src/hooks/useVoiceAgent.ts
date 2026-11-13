import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Appointment,
  GuideRequest,
  TranscriptEntry,
  VoiceStatus,
} from "../types";

function resampleTo16kHz(
  samples: Float32Array,
  sourceSampleRate: number
): Float32Array {
  if (sourceSampleRate === 16000) return samples;
  const ratio = sourceSampleRate / 16000;
  const targetLength = Math.max(1, Math.round(samples.length / ratio));
  const resampled = new Float32Array(targetLength);
  for (let i = 0; i < targetLength; i++) {
    const srcPos = i * ratio;
    const low = Math.floor(srcPos);
    const high = Math.min(samples.length - 1, low + 1);
    const frac = srcPos - low;
    resampled[i] = samples[low] * (1 - frac) + samples[high] * frac;
  }
  return resampled;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = Math.floor(bytes.length / 2);
  const float32 = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface UseVoiceAgentOptions {
  onBookingConfirmed?: (
    booking: Appointment,
    availableSlots?: string[]
  ) => void;
  onGuideRequested?: (guideRequest: GuideRequest) => void;
}

export function useVoiceAgent(options?: UseVoiceAgentOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [micUnavailable, setMicUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [levels, setLevels] = useState<number[]>(() => Array(28).fill(0.08));
  const [bookedCall, setBookedCall] = useState<Appointment | null>(null);
  const [guideSent, setGuideSent] = useState<GuideRequest | null>(null);
  const [isTypingReply, setIsTypingReply] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);
  const statusRef = useRef<VoiceStatus>("idle");
  const rafRef = useRef<number | null>(null);
  const activeTopicRef = useRef<string | undefined>(undefined);
  const sessionReadyRef = useRef<boolean>(false);
  const lastPlaybackEndMsRef = useRef<number>(0);
  const activeSpeakerTurnRef = useRef<"caller" | "receptionist" | null>(null);
  const callbacksRef = useRef(options);

  callbacksRef.current = options;

  const setStatusSynced = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stopOutputPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const cleanupAudioAndSocket = useCallback(() => {
    sessionReadyRef.current = false;
    activeSpeakerTurnRef.current = null;
    lastPlaybackEndMsRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    stopOutputPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }

    setLevels(Array(28).fill(0.08));
  }, [stopOutputPlayback]);

  const appendTranscriptDelta = useCallback(
    (speaker: "caller" | "receptionist", delta: string) => {
      const cleaned = delta.replace(/[*_`#]/g, "");
      if (!cleaned) return;
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.speaker === speaker &&
          activeSpeakerTurnRef.current === speaker
        ) {
          const merged = `${last.text}${cleaned}`.replace(/\s+/g, " ");
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text: merged,
            },
          ];
        }
        activeSpeakerTurnRef.current = speaker;
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            speaker,
            text: cleaned.trimStart(),
            timestamp: formatTime(),
          },
        ];
      });
    },
    []
  );

  const playPcmChunk = useCallback(
    (base64: string) => {
      const ctx = outputAudioCtxRef.current;
      if (!ctx) return;

      const float32 = base64Pcm16ToFloat32(base64);
      if (float32.length === 0) return;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (outputAnalyserRef.current) {
        source.connect(outputAnalyserRef.current);
      } else {
        source.connect(ctx.destination);
      }

      // 80ms jitter buffer cushion when starting or recovering from a network gap
      if (nextStartTimeRef.current <= ctx.currentTime + 0.005) {
        nextStartTimeRef.current = ctx.currentTime + 0.08;
      }
      const startAt = nextStartTimeRef.current;
      nextStartTimeRef.current = startAt + buffer.duration;

      activeSourcesRef.current.add(source);
      setStatusSynced("speaking");

      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (activeSourcesRef.current.size === 0) {
          lastPlaybackEndMsRef.current = performance.now();
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            setStatusSynced("listening");
          }
        }
      };

      source.start(startAt);
    },
    [setStatusSynced]
  );

  const startVisualizerLoop = useCallback(() => {
    const barCount = 28;
    const freqData = new Uint8Array(64);

    const tick = () => {
      const currentStatus = statusRef.current;
      const analyser =
        currentStatus === "speaking"
          ? outputAnalyserRef.current
          : inputAnalyserRef.current;

      if (
        analyser &&
        (currentStatus === "speaking" ||
          (currentStatus === "listening" && !isMutedRef.current))
      ) {
        analyser.getByteFrequencyData(freqData);
        const nextBars: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const bin = Math.min(freqData.length - 1, Math.floor((i * 22) / barCount));
          const normalized = Math.max(0.08, Math.min(1, freqData[bin] / 210));
          nextBars.push(normalized);
        }
        setLevels(nextBars);
      } else {
        setLevels(Array(barCount).fill(0.08));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startCall = useCallback(
    async (topic?: string) => {
      cleanupAudioAndSocket();
      activeTopicRef.current = topic;
      setErrorMessage(null);
      setMicUnavailable(false);
      setBookedCall(null);
      setGuideSent(null);
      setTranscript([]);
      isMutedRef.current = false;
      setIsMuted(false);
      setStatusSynced("connecting");

      try {
        // Initialize 24kHz output audio context directly inside user click handler
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        if (outputCtx.state === "suspended") {
          await outputCtx.resume();
        }
        const outputAnalyser = outputCtx.createAnalyser();
        outputAnalyser.fftSize = 128;
        outputAnalyser.smoothingTimeConstant = 0.7;
        outputAnalyser.connect(outputCtx.destination);
        outputAudioCtxRef.current = outputCtx;
        outputAnalyserRef.current = outputAnalyser;

        // Try requesting microphone (graceful fallback to listen + type if denied/missing)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;

          const inputCtx = new AudioContext();
          if (inputCtx.state === "suspended") {
            await inputCtx.resume();
          }
          const source = inputCtx.createMediaStreamSource(stream);
          const inputAnalyser = inputCtx.createAnalyser();
          inputAnalyser.fftSize = 128;
          inputAnalyser.smoothingTimeConstant = 0.7;

          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          const silentGain = inputCtx.createGain();
          silentGain.gain.value = 0;

          source.connect(inputAnalyser);
          inputAnalyser.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(inputCtx.destination);

          const nativeRate = inputCtx.sampleRate;
          processor.onaudioprocess = (event) => {
            if (
              !sessionReadyRef.current ||
              isMutedRef.current ||
              !wsRef.current ||
              wsRef.current.readyState !== WebSocket.OPEN
            ) {
              return;
            }
            // Prevent speaker-to-mic echo from cutting off or confusing the live model
            if (
              activeSourcesRef.current.size > 0 ||
              performance.now() - lastPlaybackEndMsRef.current < 320
            ) {
              return;
            }
            const channelData = event.inputBuffer.getChannelData(0);
            const pcm16k = resampleTo16kHz(channelData, nativeRate);
            const audio = float32ToPcm16Base64(pcm16k);
            wsRef.current.send(JSON.stringify({ audio }));
          };

          inputAudioCtxRef.current = inputCtx;
          inputAnalyserRef.current = inputAnalyser;
          processorRef.current = processor;
        } catch {
          setMicUnavailable(true);
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const query = topic ? `?topic=${encodeURIComponent(topic)}` : "";
        const ws = new WebSocket(`${protocol}//${window.location.host}/live${query}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as {
              type?: string;
              audio?: string;
              text?: string;
              message?: string;
              booking?: Appointment;
              guideRequest?: GuideRequest;
              availableSlots?: string[];
            };

            if (msg.type === "ready") {
              sessionReadyRef.current = true;
              setStatusSynced("listening");
              startVisualizerLoop();
            } else if (msg.type === "audio" && msg.audio) {
              playPcmChunk(msg.audio);
            } else if (msg.type === "inputTranscript" && msg.text) {
              appendTranscriptDelta("caller", msg.text);
            } else if (msg.type === "outputTranscript" && msg.text) {
              appendTranscriptDelta("receptionist", msg.text);
            } else if (msg.type === "interrupted") {
              stopOutputPlayback();
              activeSpeakerTurnRef.current = null;
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                setStatusSynced("listening");
              }
            } else if (msg.type === "turnComplete") {
              activeSpeakerTurnRef.current = null;
            } else if (msg.type === "bookingConfirmed" && msg.booking) {
              setBookedCall(msg.booking);
              callbacksRef.current?.onBookingConfirmed?.(
                msg.booking,
                msg.availableSlots
              );
            } else if (msg.type === "guideRequested" && msg.guideRequest) {
              setGuideSent(msg.guideRequest);
              callbacksRef.current?.onGuideRequested?.(msg.guideRequest);
            } else if (msg.type === "error") {
              setErrorMessage(
                msg.message || "The voice session encountered an unexpected issue."
              );
              setStatusSynced("error");
            } else if (msg.type === "closed") {
              if (statusRef.current !== "error") {
                setStatusSynced("idle");
              }
            }
          } catch {
            // Ignore malformed JSON frames
          }
        };

        ws.onerror = () => {
          setErrorMessage(
            "Unable to connect to the live voice server. You can still send a typed message below."
          );
          setStatusSynced("error");
        };

        ws.onclose = () => {
          if (
            statusRef.current !== "idle" &&
            statusRef.current !== "error"
          ) {
            setStatusSynced("idle");
          }
          cleanupAudioAndSocket();
        };
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Could not initialize audio playback."
        );
        setStatusSynced("error");
        cleanupAudioAndSocket();
      }
    },
    [
      appendTranscriptDelta,
      cleanupAudioAndSocket,
      playPcmChunk,
      setStatusSynced,
      startVisualizerLoop,
      stopOutputPlayback,
    ]
  );

  const endCall = useCallback(() => {
    setStatusSynced("idle");
    cleanupAudioAndSocket();
  }, [cleanupAudioAndSocket, setStatusSynced]);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
  }, []);

  const interruptAndListen = useCallback(() => {
    stopOutputPlayback();
    lastPlaybackEndMsRef.current = 0;
    activeSpeakerTurnRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setStatusSynced("listening");
    }
  }, [setStatusSynced, stopOutputPlayback]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      activeSpeakerTurnRef.current = null;
      setTranscript((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          speaker: "caller",
          text: trimmed,
          timestamp: formatTime(),
        },
      ]);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ text: trimmed }));
        return;
      }

      // Text fallback via /api/chat when voice socket is not active
      setIsTypingReply(true);
      try {
        const history = transcript.map((entry) => ({
          role: entry.speaker === "caller" ? "user" : "model",
          text: entry.text,
        }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history,
            message: trimmed,
            topic: activeTopicRef.current,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          booking?: Appointment;
          guideRequest?: GuideRequest;
          availableSlots?: string[];
          error?: string;
        };

        if (!res.ok || data.error) {
          setErrorMessage(data.error || "Unable to send message right now.");
          return;
        }

        if (data.reply) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              speaker: "receptionist",
              text: data.reply || "",
              timestamp: formatTime(),
            },
          ]);
        }

        if (data.booking) {
          setBookedCall(data.booking);
          callbacksRef.current?.onBookingConfirmed?.(
            data.booking,
            data.availableSlots
          );
        }
        if (data.guideRequest) {
          setGuideSent(data.guideRequest);
          callbacksRef.current?.onGuideRequested?.(data.guideRequest);
        }
      } catch {
        setErrorMessage("Network error while reaching the receptionist.");
      } finally {
        setIsTypingReply(false);
      }
    },
    [transcript]
  );

  useEffect(() => {
    return () => {
      cleanupAudioAndSocket();
    };
  }, [cleanupAudioAndSocket]);

  return {
    status,
    isMuted,
    micUnavailable,
    errorMessage,
    transcript,
    levels,
    bookedCall,
    guideSent,
    isTypingReply,
    startCall,
    endCall,
    toggleMute,
    interruptAndListen,
    sendTextMessage,
  };
}
