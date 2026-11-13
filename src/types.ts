export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export interface TranscriptEntry {
  id: string;
  speaker: "caller" | "receptionist";
  text: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  fullName: string;
  contact: string;
  projectOverview: string;
  slot: string;
  source: "voice" | "form";
  createdAt: string;
}

export interface GuideRequest {
  id: string;
  fullName: string;
  email: string;
  interest: string;
  createdAt: string;
}

export interface ServicePillar {
  number: string;
  title: string;
  subtitle: string;
  pricingLabel: string;
  pricingDetail: string;
  description: string;
  deliverables: string[];
  topicPrompt: string;
  image?: string;
  imageAlt?: string;
}
