import { useState, type FormEvent } from "react";
import { CalendarCheck, Clock, Mail, Mic, CheckCircle2 } from "lucide-react";
import type { Appointment } from "../types";

interface BookingSectionProps {
  availableSlots: string[];
  onBookSuccess: (booking: Appointment, nextSlots: string[]) => void;
  onOpenVoiceAgent: (topic?: string) => void;
  latestVoiceBooking: Appointment | null;
}

export function BookingSection({
  availableSlots,
  onBookSuccess,
  onOpenVoiceAgent,
  latestVoiceBooking,
}: BookingSectionProps) {
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(
    availableSlots[0] || "Thursday at 2:00 PM PT"
  );
  const [projectOverview, setProjectOverview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(
    null
  );

  const effectiveSlot = availableSlots.includes(selectedSlot)
    ? selectedSlot
    : availableSlots[0] || "Thursday at 2:00 PM PT";

  const activeConfirmation = confirmedBooking || latestVoiceBooking;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (fullName.trim().length < 2) {
      setFormError("Please enter your full name.");
      return;
    }
    if (contact.trim().length < 4) {
      setFormError("Please enter your email address or callback phone number.");
      return;
    }
    if (projectOverview.trim().length < 5) {
      setFormError("Please share a short 1–2 sentence overview of your project.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          contact: contact.trim(),
          projectOverview: projectOverview.trim(),
          slot: effectiveSlot,
        }),
      });
      const data = (await res.json()) as {
        booking?: Appointment;
        availableSlots?: string[];
        error?: string;
      };
      if (!res.ok || !data.booking) {
        setFormError(
          data.error || "Could not reserve your discovery call. Please try again."
        );
        return;
      }

      setConfirmedBooking(data.booking);
      onBookSuccess(data.booking, data.availableSlots || []);
      setFullName("");
      setContact("");
      setProjectOverview("");
    } catch {
      setFormError("Network error while booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="border-t border-[#E4E6EA] bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left: Business Information & Direct Voice Option */}
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-wide text-[#1D4ED8]">
              Contact &amp; Studio Information
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#111315] text-balance sm:text-4xl">
              Book a 15-minute discovery call with Romeo M
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#4B5563]">
              Every brand and project scope is unique. Share your goals below or
              speak directly with our AI receptionist to lock in a custom quote
              and reserve a slot on Romeo&apos;s calendar.
            </p>

            <div className="mt-8 space-y-5 border-t border-[#E4E6EA] pt-8 text-sm">
              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-[#111315]">Direct Studio Email</p>
                  <a
                    href="mailto:romeomoffice@gmail.com"
                    className="text-[#4B5563] underline-offset-4 hover:text-[#1D4ED8] hover:underline"
                  >
                    romeomoffice@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-[#111315]">Studio Hours</p>
                  <p className="text-[#4B5563] tabular-nums">
                    Monday – Friday, 9:00 AM – 6:00 PM PT
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-[#111315]">
                    Discovery Consultations
                  </p>
                  <p className="text-[#4B5563]">
                    15-minute introductory calls for custom scope, retainers, and
                    launch timelines
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-[#E4E6EA] bg-[#FAFAFA] p-5">
              <p className="font-display text-sm font-semibold text-[#111315]">
                Prefer to talk instead of filling out a form?
              </p>
              <p className="mt-1.5 text-sm text-[#4B5563]">
                Our AI voice receptionist answers pricing questions and books your
                time slot in real time.
              </p>
              <button
                type="button"
                onClick={() => onOpenVoiceAgent("Booking a discovery call")}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#111315] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1F2937] cursor-pointer whitespace-nowrap"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Speak with AI Receptionist</span>
              </button>
            </div>
          </div>

          {/* Right: Validated Booking Form */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#E4E6EA] bg-[#FAFAFA] p-6 sm:p-8">
              {activeConfirmation ? (
                <div className="space-y-5 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-6 w-6 shrink-0 text-[#0F766E]"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="font-display text-xl font-semibold text-[#111315]">
                        You&apos;re all set, {activeConfirmation.fullName}
                      </h3>
                      <p className="mt-1 text-sm text-[#4B5563]">
                        Your discovery call with Romeo M is reserved for{" "}
                        <span className="font-medium text-[#111315] tabular-nums">
                          {activeConfirmation.slot}
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E4E6EA] bg-white p-4 text-sm text-[#374151] space-y-2">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6B7280]">Reference</span>
                      <span className="font-medium tabular-nums">
                        {activeConfirmation.id}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#6B7280]">Contact</span>
                      <span className="font-medium">
                        {activeConfirmation.contact}
                      </span>
                    </div>
                    <div className="border-t border-[#E4E6EA] pt-2">
                      <span className="text-xs text-[#6B7280]">
                        Project Overview
                      </span>
                      <p className="mt-1 text-[#111315]">
                        {activeConfirmation.projectOverview}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmedBooking(null)}
                    className="min-h-[44px] rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-sm font-medium text-[#111315] transition-colors hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    Schedule Another Time
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="booking-name"
                        className="block text-sm font-medium text-[#111315]"
                      >
                        Full Name
                      </label>
                      <input
                        id="booking-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jordan Taylor"
                        className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E4E6EA] bg-white px-3.5 text-sm text-[#111315] placeholder:text-[#9CA3AF] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="booking-contact"
                        className="block text-sm font-medium text-[#111315]"
                      >
                        Best Email or Phone
                      </label>
                      <input
                        id="booking-contact"
                        type="text"
                        required
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="jordan@company.com"
                        className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E4E6EA] bg-white px-3.5 text-sm text-[#111315] placeholder:text-[#9CA3AF] focus:border-[#1D4ED8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-[#111315]">
                      Select an Open Time Slot
                    </span>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(availableSlots.length > 0
                        ? availableSlots
                        : ["Next Tuesday at 10:00 AM PT"]
                      ).map((slot) => {
                        const selected = effectiveSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`min-h-[44px] rounded-lg border px-3.5 py-2 text-left text-sm font-medium tabular-nums transition-colors cursor-pointer ${
                              selected
                                ? "border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]"
                                : "border-[#E4E6EA] bg-white text-[#111315] hover:border-[#9CA3AF]"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="booking-overview"
                      className="block text-sm font-medium text-[#111315]"
                    >
                      Project Overview
                    </label>
                    <textarea
                      id="booking-overview"
                      rows={3}
                      required
                      value={projectOverview}
                      onChange={(e) => setProjectOverview(e.target.value)}
                      placeholder="Tell us in a sentence or two whether you're focused on messaging, content production, or launching a digital product."
                      className="mt-1.5 w-full rounded-lg border border-[#E4E6EA] bg-white p-3.5 text-sm text-[#111315] placeholder:text-[#9CA3AF] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-sm text-[#991B1B]"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <p className="text-xs text-[#6B7280]">
                      Confirmation details sent immediately after booking.
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1D4ED8] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      {submitting
                        ? "Reserving Slot..."
                        : "Schedule Discovery Call"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
