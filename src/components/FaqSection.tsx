import { useState } from "react";
import { ChevronDown, Mic } from "lucide-react";

interface FaqItem {
  number: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    number: "01",
    question: "How does pricing work if every project has a different scope?",
    answer:
      "We share clear benchmark ranges upfront—starting around $500 for initial communication audits and strategy sessions, $1,500 to $4,000+ per month for content production retainers, and $2,000 to $5,000 for digital product launch packages. Because every brand and deliverable mix is different, Romeo customizes an exact quote after a quick 15-minute discovery call.",
  },
  {
    number: "02",
    question: "Can I start with a communication audit before a larger engagement?",
    answer:
      "Yes. Many clients begin with a focused communication audit and strategy session to sharpen their brand voice, core messaging, or presentation structure before moving into ongoing content production or a digital product build.",
  },
  {
    number: "03",
    question: "What is included in end-to-end content production?",
    answer:
      "Monthly content production retainers are tailored to your channels and volume—covering podcast editing and mastering, video content scripting and strategy, conversion copywriting, and cohesive multimedia storytelling managed from concept through delivery.",
  },
  {
    number: "04",
    question: "What kind of digital products do you help build and launch?",
    answer:
      "Romeo M supports the full lifecycle for e-books, online courses, downloadable templates, and membership sites—from positioning and curriculum structure to platform setup and launch messaging.",
  },
  {
    number: "05",
    question: "What happens on the 15-minute discovery call with Romeo?",
    answer:
      "It is a relaxed introductory conversation to understand your goals, audience, and timeline. You can ask Romeo questions directly, clarify which service pillar fits best, and leave with a clear next step and tailored scope—no high-pressure sales pitch.",
  },
  {
    number: "06",
    question: "Can I see work samples if I'm still exploring?",
    answer:
      "Of course. Taking your time is smart. You can ask our AI voice receptionist right here on the page to queue Romeo M's digital guide and portfolio of past work, or reach out directly at romeomoffice@gmail.com.",
  },
];

interface FaqSectionProps {
  onOpenVoiceAgent: (topic?: string) => void;
}

export function FaqSection({ onOpenVoiceAgent }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      className="border-t border-[#E4E6EA] bg-[#FAFAFA] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Sticky-Friendly Editorial Intro */}
          <div className="lg:col-span-4">
            <p className="text-xs font-medium tracking-wide text-[#1D4ED8]">
              Frequently Asked Questions
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#111315] text-balance sm:text-4xl">
              Clear answers before we get on a call
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#4B5563] sm:text-base">
              Everything you need to know about our consulting audits, retainers,
              product launches, and how Romeo M scopes engagements.
            </p>

            <div className="mt-7 border-t border-[#E4E6EA] pt-6">
              <p className="text-sm font-medium text-[#111315]">
                Have a specific question about your project?
              </p>
              <button
                type="button"
                onClick={() => onOpenVoiceAgent("Questions about services and process")}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E4E6EA] bg-white px-4 py-2 text-sm font-medium text-[#111315] transition-colors duration-150 hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer whitespace-nowrap"
              >
                <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Ask Our AI Receptionist</span>
              </button>
            </div>
          </div>

          {/* Right Accordion Stack */}
          <div className="lg:col-span-8">
            <div className="divide-y divide-[#E4E6EA] overflow-hidden rounded-2xl border border-[#E4E6EA] bg-white">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openIndex === index;
                const buttonId = `faq-trigger-${item.number}`;
                const panelId = `faq-panel-${item.number}`;

                return (
                  <div key={item.number}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(index)}
                        className="flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1D4ED8] sm:px-7 sm:py-5 cursor-pointer"
                      >
                        <span className="flex items-baseline gap-3 sm:gap-4">
                          <span className="font-display text-xs font-semibold tabular-nums text-[#1D4ED8] shrink-0">
                            {item.number}.
                          </span>
                          <span className="font-display text-base font-semibold text-[#111315] sm:text-lg">
                            {item.question}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-[#4B5563] transition-transform duration-150 ${
                            isOpen ? "rotate-180 text-[#1D4ED8]" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>

                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="px-5 pb-5 pl-12 text-sm leading-relaxed text-[#4B5563] sm:px-7 sm:pb-6 sm:pl-14 sm:text-base"
                      >
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
