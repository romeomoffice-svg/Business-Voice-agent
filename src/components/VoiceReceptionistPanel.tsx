import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarCheck,
  FileText,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  Volume2,
  X,
} from "lucide-react";
import type {
  Appointment,
  GuideRequest,
  TranscriptEntry,
  VoiceStatus,
} from "../types";

interface VoiceReceptionistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  status: VoiceStatus;
  isMuted: boolean;
  micUnavailable: boolean;
  errorMessage: string | null;
  transcript: TranscriptEntry[];
  levels: number[];
  bookedCall: Appointment | null;
  guideSent: GuideRequest | null;
  isTypingReply: boolean;
  selectedTopic?: string;
  onStartCall: (topic?: string) => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onSendText: (text: string) => void;
}

const STARTER_PROMPTS = [
  "What services does Romeo M offer?",
  "How much does content production cost?",
  "I'd like to book a discovery call",
];

function getStatusMeta(status: VoiceStatus, isMuted: boolean) {
  if (status === "connecting") {
    return {
      label: "Connecting to Receptionist",
      toneClass: "text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]",
      icon: Loader2,
      spin: true,
    };
  }
  if (status === "speaking") {
    return {
      label: "Receptionist Speaking",
      toneClass: "text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]",
      icon: Volume2,
      spin: false,
    };
  }
  if (status === "listening") {
    return {
      label: isMuted ? "Microphone Muted" : "Listening Live",
      toneClass: isMuted
        ? "text-[#4B5563] bg-[#F3F4F6] border-[#E4E6EA]"
        : "text-[#0F766E] bg-[#F0FDFA] border-[#99F6E4]",
      icon: isMuted ? MicOff : Mic,
      spin: false,
    };
  }
  if (status === "error") {
    return {
      label: "Connection Issue",
      toneClass: "text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]",
      icon: AlertCircle,
      spin: false,
    };
  }
  return {
    label: "Ready to Connect",
    toneClass: "text-[#4B5563] bg-[#F3F4F6] border-[#E4E6EA]",
    icon: PhoneCall,
    spin: false,
  };
}

export function VoiceReceptionistPanel({
  isOpen,
  onClose,
  status,
  isMuted,
  micUnavailable,
  errorMessage,
  transcript,
  levels,
  bookedCall,
  guideSent,
  isTypingReply,
  selectedTopic,
  onStartCall,
  onEndCall,
  onToggleMute,
  onInterrupt,
  onSendText,
}: VoiceReceptionistPanelProps) {
  const [draft, setDraft] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, bookedCall, guideSent, isTypingReply]);

  if (!isOpen) return null;

  const isActive =
    status === "connecting" || status === "listening" || status === "speaking";
  const statusMeta = getStatusMeta(status, isMuted);
  const StatusIcon = statusMeta.icon;

  const handleSubmitText = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSendText(draft);
    setDraft("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111315]/45 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-panel-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#E4E6EA] bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E4E6EA] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="voice-panel-title"
              className="font-display text-lg font-semibold tracking-tight text-[#111315]"
            >
              Romeo M AI Voice Receptionist
            </h2>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {selectedTopic
                ? `Topic focus: ${selectedTopic} · Ask about scope, pricing, or open times`
                : "Ask about services, pricing, or schedule a 15-minute discovery call"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice receptionist"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-[#E4E6EA] text-[#4B5563] transition-colors hover:bg-[#F3F4F6] hover:text-[#111315] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Audio Status & Real-Time Acoustic Visualizer */}
        <div className="border-b border-[#E4E6EA] bg-[#FAFAFA] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${statusMeta.toneClass}`}
            >
              <StatusIcon
                className={`h-3.5 w-3.5 shrink-0 ${statusMeta.spin ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{statusMeta.label}</span>
            </div>

            <div className="flex items-center gap-2">
              {status === "speaking" && !micUnavailable && (
                <button
                  type="button"
                  onClick={onInterrupt}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-2 text-sm font-medium text-[#1D4ED8] transition-colors hover:bg-[#DBEAFE] cursor-pointer whitespace-nowrap"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>Speak Now</span>
                </button>
              )}

              {isActive && !micUnavailable && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-sm font-medium text-[#111315] transition-colors hover:bg-[#F3F4F6] cursor-pointer whitespace-nowrap"
                >
                  {isMuted ? (
                    <>
                      <MicOff className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
                      <span>Unmute</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
                      <span>Mute</span>
                    </>
                  )}
                </button>
              )}

              {isActive ? (
                <button
                  type="button"
                  onClick={onEndCall}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] cursor-pointer whitespace-nowrap"
                >
                  <PhoneOff className="h-4 w-4" aria-hidden="true" />
                  <span>End Call</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartCall(selectedTopic)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
                >
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                  <span>{transcript.length > 0 ? "Reconnect Voice" : "Start Voice Call"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Acoustic frequency meter */}
          <div
            className="mt-4 flex h-12 items-center justify-center gap-1 rounded-xl border border-[#E4E6EA] bg-white px-4"
            aria-hidden="true"
          >
            {levels.map((level, index) => (
              <span
                key={index}
                style={{
                  transform: `scaleY(${level})`,
                }}
                className={`h-8 w-1 origin-center rounded-full transition-transform duration-75 ${
                  status === "speaking"
                    ? "bg-[#1D4ED8]"
                    : status === "listening" && !isMuted
                      ? "bg-[#0F766E]"
                      : "bg-[#D1D5DB]"
                }`}
              />
            ))}
          </div>

          {micUnavailable && (
            <p className="mt-3 text-xs text-[#4B5563]">
              Microphone access is unavailable or declined. You can still listen to
              the receptionist and type your responses below.
            </p>
          )}

          {errorMessage && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Conversation Transcript */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6 min-h-[220px] max-h-[360px]">
          {transcript.length === 0 && !isTypingReply ? (
            <div className="space-y-4 py-2">
              <p className="text-sm leading-relaxed text-[#4B5563]">
                {status === "connecting"
                  ? "Connecting you with Romeo M's digital assistant now..."
                  : "Click Start Voice Call to speak directly, or choose a question below to begin."}
              </p>

              <div className="flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSendText(prompt)}
                    className="min-h-[40px] rounded-lg border border-[#E4E6EA] bg-[#FAFAFA] px-3.5 py-2 text-left text-xs font-medium text-[#111315] transition-colors hover:border-[#1D4ED8]/40 hover:bg-[#EFF6FF] cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {transcript.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex flex-col ${
                    entry.speaker === "caller" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-[#6B7280]">
                    <span className="font-medium text-[#111315]">
                      {entry.speaker === "caller" ? "You" : "Romeo M Receptionist"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{entry.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      entry.speaker === "caller"
                        ? "bg-[#111315] text-white"
                        : "border border-[#E4E6EA] bg-[#FAFAFA] text-[#111315]"
                    }`}
                  >
                    {entry.text}
                  </div>
                </div>
              ))}

              {isTypingReply && (
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Romeo M Receptionist is responding...</span>
                </div>
              )}
            </>
          )}

          {bookedCall && (
            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
              <div className="flex items-start gap-3">
                <CalendarCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-display font-semibold text-[#111315]">
                    Discovery Call Confirmed
                  </p>
                  <p className="mt-1 text-[#374151]">
                    Booked for <span className="font-medium">{bookedCall.fullName}</span>{" "}
                    on <span className="font-medium tabular-nums">{bookedCall.slot}</span>.
                  </p>
                  <p className="mt-1 text-xs text-[#4B5563]">
                    Contact: {bookedCall.contact} · Reference: {bookedCall.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {guideSent && (
            <div className="rounded-xl border border-[#E4E6EA] bg-[#FAFAFA] p-4">
              <div className="flex items-start gap-3">
                <FileText
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-display font-semibold text-[#111315]">
                    Digital Guide &amp; Portfolio Queued
                  </p>
                  <p className="mt-1 text-[#374151]">
                    We will send Romeo M&apos;s work samples to{" "}
                    <span className="font-medium">{guideSent.email}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Typed Message Input */}
        <form
          onSubmit={handleSubmitText}
          className="flex items-center gap-2 border-t border-[#E4E6EA] bg-white px-5 py-3.5 sm:px-6"
        >
          <label htmlFor="voice-text-fallback" className="sr-only">
            Type a message or spell your email address
          </label>
          <input
            id="voice-text-fallback"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message, question, or email address..."
            className="min-h-[44px] flex-1 rounded-lg border border-[#E4E6EA] bg-[#FAFAFA] px-3.5 text-sm text-[#111315] placeholder:text-[#6B7280] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isTypingReply}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#111315] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
