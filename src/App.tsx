import { useEffect, useState } from "react";
import { ArrowRight, Headphones, Mic, PhoneCall, Sparkles } from "lucide-react";
import { Navbar } from "./components/Navbar";
import { VoiceReceptionistPanel } from "./components/VoiceReceptionistPanel";
import { BookingSection } from "./components/BookingSection";
import { FaqSection } from "./components/FaqSection";
import { useVoiceAgent } from "./hooks/useVoiceAgent";
import type { Appointment, ServicePillar } from "./types";

const SERVICES: ServicePillar[] = [
  {
    number: "01",
    title: "Business Communication",
    subtitle: "Consulting · Messaging · Coaching",
    pricingLabel: "From $500",
    pricingDetail: "Initial communication audits & strategy sessions",
    description:
      "Refine how your leadership and brand speak to customers, investors, and partners. We build clear messaging frameworks, coach executive presentations, and establish a consistent brand voice.",
    deliverables: [
      "Messaging & positioning architecture",
      "Executive presentation coaching",
      "Brand voice guidelines & playbooks",
    ],
    topicPrompt: "Business Communication",
  },
  {
    number: "02",
    title: "Content Production",
    subtitle: "Podcast · Video · Copywriting",
    pricingLabel: "$1,500 – $4,000+ / mo",
    pricingDetail: "Monthly retainers scaled to audio, video, or written volume",
    description:
      "End-to-end digital storytelling managed from script to final master. Whether launching an authority podcast, scripting video series, or shipping editorial copy, every piece stays on-message.",
    deliverables: [
      "Full podcast production & editing",
      "Video content scripting & strategy",
      "Conversion copywriting & editorial",
    ],
    topicPrompt: "Content Production",
    image: "/src/assets/images/service_content_production_1794602783169.jpg",
    imageAlt:
      "Podcast production desk with broadcast microphone, audio interface, headphones, and script notebook",
  },
  {
    number: "03",
    title: "Digital Products",
    subtitle: "Courses · E-Books · Memberships",
    pricingLabel: "$2,000 – $5,000",
    pricingDetail: "Turnkey launch & productization packages by platform scope",
    description:
      "Turn your expertise into durable revenue assets. We guide strategy, curriculum structure, platform setup, and launch materials for courses, e-books, templates, and membership communities.",
    deliverables: [
      "Product strategy & curriculum structure",
      "Course, e-book & template creation",
      "Membership platform & launch setup",
    ],
    topicPrompt: "Digital Products",
    image: "/src/assets/images/service_digital_products_1794602783795.jpg",
    imageAlt:
      "Minimalist travertine desk displaying digital product wireframes, laptop, tablet, and printed modular guidebooks",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "15-Minute Discovery Call",
    description:
      "Speak with our AI receptionist now or book directly on the calendar. We capture your project goals, timeline, and preferred communication channels.",
  },
  {
    number: "02",
    title: "Tailored Scope & Proposal",
    description:
      "Because every brand has different deliverables, Romeo M builds a transparent scope—whether a focused $500 audit, monthly production retainer, or full product launch.",
  },
  {
    number: "03",
    title: "Production & Launch",
    description:
      "Direct collaboration from strategy through final audio, video, messaging, and product release—delivering assets ready for your audience.",
  },
];

export default function App() {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(
    undefined
  );
  const [heroImgError, setHeroImgError] = useState(false);
  const [serviceImgErrors, setServiceImgErrors] = useState<
    Record<string, boolean>
  >({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    "Thursday at 2:00 PM PT",
    "Thursday at 4:00 PM PT",
    "Friday at 10:00 AM PT",
    "Friday at 11:30 AM PT",
    "Monday at 1:00 PM PT",
  ]);
  const [latestVoiceBooking, setLatestVoiceBooking] =
    useState<Appointment | null>(null);

  useEffect(() => {
    fetch("/api/studio/availability")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { availableSlots?: string[] } | null) => {
        if (data?.availableSlots?.length) {
          setAvailableSlots(data.availableSlots);
        }
      })
      .catch(() => {});
  }, []);

  const voiceAgent = useVoiceAgent({
    onBookingConfirmed: (booking, nextSlots) => {
      setLatestVoiceBooking(booking);
      if (nextSlots?.length) {
        setAvailableSlots(nextSlots);
      }
    },
  });

  const isVoiceActive =
    voiceAgent.status === "connecting" ||
    voiceAgent.status === "listening" ||
    voiceAgent.status === "speaking";

  const handleOpenVoiceAgent = (topic?: string) => {
    setSelectedTopic(topic);
    setVoiceModalOpen(true);
    if (!isVoiceActive || (topic && topic !== selectedTopic)) {
      void voiceAgent.startCall(topic);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111315]">
      <Navbar
        onOpenVoiceAgent={() => handleOpenVoiceAgent()}
        isVoiceActive={isVoiceActive}
      />

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy & Prominent Voice Interaction Button */}
            <div className="flex flex-col justify-between lg:col-span-6">
              <div>
                <p className="text-xs font-medium tracking-wide text-[#1D4ED8]">
                  Romeo M · Communication, Content &amp; Digital Products
                </p>

                <h1
                  className="mt-4 font-display font-bold tracking-tight text-[#111315] text-balance"
                  style={{
                    fontSize: "clamp(2.25rem, 4vw, 3.65rem)",
                    lineHeight: 1.08,
                  }}
                >
                  Clear messaging, standout content, and digital products built to launch.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4B5563] sm:text-lg">
                  Romeo M partners with founders and teams on brand communication
                  strategy, end-to-end podcast and video production, and turnkey
                  digital product releases.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleOpenVoiceAgent()}
                    className="inline-flex min-h-[52px] items-center gap-3 rounded-xl bg-[#1D4ED8] px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] cursor-pointer whitespace-nowrap"
                  >
                    <Mic className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>
                      {isVoiceActive
                        ? "Return to Live Voice Call"
                        : "Speak with Our AI Receptionist"}
                    </span>
                  </button>

                  <a
                    href="#contact"
                    className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-[#E4E6EA] bg-white px-5 py-3.5 text-sm font-medium text-[#111315] transition-colors duration-150 hover:border-[#9CA3AF] hover:bg-[#F3F4F6] whitespace-nowrap"
                  >
                    <span>Schedule Discovery Call</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </a>
                </div>

                <p className="text-xs text-[#6B7280]">
                  Real-time voice answers on services, pricing ranges, and
                  openings this week · No waiting on email
                </p>
              </div>
            </div>

            {/* Right Hero Studio Visual */}
            <div className="lg:col-span-6">
              <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-[#E4E6EA] bg-[#EFEFEF] sm:h-96 lg:h-full lg:min-h-[420px]">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_studio_workspace_1794602783535.jpg"
                    alt="Romeo M Studio workspace featuring a light oak conference table, broadcast microphone, and natural window light"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] p-8 text-center">
                    <Headphones
                      className="h-10 w-10 text-[#1D4ED8]"
                      aria-hidden="true"
                    />
                    <p className="mt-3 font-display text-lg font-semibold text-[#111315]">
                      Romeo M Studio
                    </p>
                    <p className="mt-1 text-sm text-[#4B5563]">
                      Business Communication &amp; Content Production
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-width 3-column summary strip below Hero */}
          <div className="mt-10 grid grid-cols-1 divide-y divide-[#E4E6EA] rounded-2xl border border-[#E4E6EA] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-6">
              <p className="text-xs font-medium text-[#6B7280]">
                Core Studio Pillars
              </p>
              <p className="mt-1.5 font-display text-lg font-semibold text-[#111315]">
                Strategy · Content · Products
              </p>
              <p className="mt-1 text-sm text-[#4B5563]">
                Unified messaging across coaching, media, and launches
              </p>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-[#6B7280]">
                Transparent Starting Scope
              </p>
              <p className="mt-1.5 font-display text-lg font-semibold tabular-nums text-[#111315]">
                Audits from $500
              </p>
              <p className="mt-1 text-sm text-[#4B5563]">
                Custom retainers and product launches tailored to goals
              </p>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-[#6B7280]">
                Instant Receptionist Access
              </p>
              <p className="mt-1.5 font-display text-lg font-semibold text-[#111315]">
                Live Voice &amp; Calendar Booking
              </p>
              <p className="mt-1 text-sm text-[#4B5563]">
                Talk directly with our AI receptionist 24/7
              </p>
            </div>
          </div>
        </section>

        {/* Dedicated Voice Interactive Showcase Strip */}
        <section className="border-y border-[#E4E6EA] bg-white py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[#111315]">
                Have questions about pricing or project fit? Ask live by voice.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5563] sm:text-base">
                Connect directly to Romeo M&apos;s digital voice receptionist for
                immediate answers on our three service pillars, package ranges,
                and available discovery call slots.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenVoiceAgent()}
              className="inline-flex min-h-[48px] shrink-0 items-center gap-2.5 rounded-xl bg-[#111315] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1F2937] cursor-pointer whitespace-nowrap"
            >
              <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Start Real-Time Voice Conversation</span>
            </button>
          </div>
        </section>

        {/* Services & Transparent Pricing Section */}
        <section
          id="services"
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
        >
          <div id="pricing" className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-[#1D4ED8]">
              Services &amp; Investment
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#111315] text-balance sm:text-4xl">
              Three focused disciplines designed to turn expertise into audience trust
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#4B5563]">
              Clear starting benchmarks below—with exact quotes customized to
              your scope during a brief discovery call.
            </p>
          </div>

          {/* Asymmetric Bento Grid */}
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Service 01: Full-width horizontal lead card */}
            <article className="rounded-2xl border border-[#E4E6EA] bg-white p-6 sm:p-8 lg:col-span-12">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                    <span className="font-medium text-[#1D4ED8] tabular-nums">
                      {SERVICES[0].number}.
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{SERVICES[0].subtitle}</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#111315]">
                    {SERVICES[0].title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#4B5563]">
                    {SERVICES[0].description}
                  </p>
                  <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-[#111315] sm:grid-cols-3">
                    {SERVICES[0].deliverables.map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border border-[#E4E6EA] bg-[#FAFAFA] px-3.5 py-2.5"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-[#E4E6EA] bg-[#FAFAFA] p-6 lg:col-span-5">
                  <div>
                    <p className="text-xs font-medium text-[#6B7280]">
                      Consulting &amp; Strategy Scope
                    </p>
                    <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#111315]">
                      {SERVICES[0].pricingLabel}
                    </p>
                    <p className="mt-1.5 text-sm text-[#4B5563]">
                      {SERVICES[0].pricingDetail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenVoiceAgent(SERVICES[0].topicPrompt)}
                    className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#E4E6EA] bg-white px-4 py-2.5 text-sm font-medium text-[#111315] transition-colors hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer whitespace-nowrap"
                  >
                    <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Ask AI About Communication Audits</span>
                  </button>
                </div>
              </div>
            </article>

            {/* Services 02 & 03: Two balanced bento cards with generated imagery */}
            {SERVICES.slice(1).map((service) => (
              <article
                key={service.number}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4E6EA] bg-white lg:col-span-6"
              >
                <div>
                  <div className="aspect-[4/3] w-full overflow-hidden border-b border-[#E4E6EA] bg-[#F3F4F6]">
                    {service.image && !serviceImgErrors[service.number] ? (
                      <img
                        src={service.image}
                        alt={service.imageAlt || service.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setServiceImgErrors((prev) => ({
                            ...prev,
                            [service.number]: true,
                          }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                        <Sparkles
                          className="h-8 w-8 text-[#1D4ED8]"
                          aria-hidden="true"
                        />
                        <p className="mt-2 font-display text-base font-semibold text-[#111315]">
                          {service.title}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                      <span className="font-medium text-[#1D4ED8] tabular-nums">
                        {service.number}.
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{service.subtitle}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-[#111315]">
                        {service.title}
                      </h3>
                      <span className="font-display text-lg font-bold tabular-nums text-[#111315]">
                        {service.pricingLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[#6B7280]">
                      {service.pricingDetail}
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-[#4B5563] sm:text-base">
                      {service.description}
                    </p>

                    <ul className="mt-5 space-y-2 border-t border-[#E4E6EA] pt-4 text-sm text-[#111315]">
                      {service.deliverables.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="text-[#1D4ED8]" aria-hidden="true">
                            —
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-[#E4E6EA] bg-[#FAFAFA] px-6 py-4 sm:px-7">
                  <button
                    type="button"
                    onClick={() => handleOpenVoiceAgent(service.topicPrompt)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-sm font-medium text-[#111315] transition-colors hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer whitespace-nowrap"
                  >
                    <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Ask AI About {service.title}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Studio Process & Scope Philosophy */}
        <section
          id="process"
          className="border-t border-[#E4E6EA] bg-white py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-medium tracking-wide text-[#1D4ED8]">
                  How Engagement Works
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#111315] text-balance sm:text-4xl">
                  Custom quotes shaped around your exact scope
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-[#4B5563]">
                No bloated retainers or cookie-cutter templates. After a 15-minute
                conversation, Romeo provides a clear project roadmap and fixed
                pricing tailored to your goals.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {PROCESS_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-[#E4E6EA] bg-white p-6 sm:p-7"
                >
                  <p className="font-display text-sm font-semibold tabular-nums text-[#1D4ED8]">
                    {step.number}.
                  </p>
                  <h3 className="mt-3 font-display text-xl font-semibold text-[#111315]">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#4B5563]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <FaqSection onOpenVoiceAgent={(topic) => handleOpenVoiceAgent(topic)} />

        {/* Business Information & Discovery Call Booking */}
        <BookingSection
          availableSlots={availableSlots}
          onBookSuccess={(booking, nextSlots) => {
            setLatestVoiceBooking(booking);
            if (nextSlots.length > 0) {
              setAvailableSlots(nextSlots);
            }
          }}
          onOpenVoiceAgent={(topic) => handleOpenVoiceAgent(topic)}
          latestVoiceBooking={latestVoiceBooking}
        />
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E4E6EA] bg-[#FAFAFA] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-base font-bold text-[#111315]">
              Romeo M
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Business Communication · Content Production · Digital Products
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#4B5563]">
            <a href="#services" className="hover:text-[#111315]">
              Services
            </a>
            <a href="#pricing" className="hover:text-[#111315]">
              Pricing
            </a>
            <a href="#process" className="hover:text-[#111315]">
              Process
            </a>
            <a href="#faq" className="hover:text-[#111315]">
              FAQ
            </a>
            <a
              href="mailto:romeomoffice@gmail.com"
              className="hover:text-[#111315]"
            >
              romeomoffice@gmail.com
            </a>
            <span className="text-[#9CA3AF]">© 2026 Romeo M</span>
          </div>
        </div>
      </footer>

      <VoiceReceptionistPanel
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        status={voiceAgent.status}
        isMuted={voiceAgent.isMuted}
        micUnavailable={voiceAgent.micUnavailable}
        errorMessage={voiceAgent.errorMessage}
        transcript={voiceAgent.transcript}
        levels={voiceAgent.levels}
        bookedCall={voiceAgent.bookedCall}
        guideSent={voiceAgent.guideSent}
        isTypingReply={voiceAgent.isTypingReply}
        selectedTopic={selectedTopic}
        onStartCall={(topic) => void voiceAgent.startCall(topic)}
        onEndCall={voiceAgent.endCall}
        onToggleMute={voiceAgent.toggleMute}
        onInterrupt={voiceAgent.interruptAndListen}
        onSendText={(text) => void voiceAgent.sendTextMessage(text)}
      />
    </div>
  );
}
