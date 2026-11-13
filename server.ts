import "dotenv/config";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
  type LiveServerMessage,
} from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

interface Appointment {
  id: string;
  fullName: string;
  contact: string;
  projectOverview: string;
  slot: string;
  source: "voice" | "form";
  createdAt: string;
}

interface GuideRequest {
  id: string;
  fullName: string;
  email: string;
  interest: string;
  createdAt: string;
}

const DEFAULT_SLOTS = [
  "Thursday at 2:00 PM PT",
  "Thursday at 4:00 PM PT",
  "Friday at 10:00 AM PT",
  "Friday at 11:30 AM PT",
  "Monday at 1:00 PM PT",
];

const appointments: Appointment[] = [];
const guideRequests: GuideRequest[] = [];

function getAvailableSlots(): string[] {
  const booked = new Set(appointments.map((a) => a.slot.toLowerCase()));
  return DEFAULT_SLOTS.filter((slot) => !booked.has(slot.toLowerCase()));
}

function buildSystemInstruction(topicHint?: string): string {
  const openSlots = getAvailableSlots();
  const slotsText =
    openSlots.length > 0
      ? openSlots.join(", ")
      : "Next week Tuesday at 10:00 AM PT or Wednesday at 2:00 PM PT";

  return `1. Role & Identity
Name/Persona: You are the friendly, professional, and charming AI voice receptionist for Romeo M.
Voice Profile: Smooth, sweet, warm, and completely natural-sounding. Speak at a relaxed, conversational pace with natural vocal inflections, gentle pauses, and an approachable, welcoming tone. Avoid sounding robotic, overly corporate, or rushed.
Core Mission: Welcome callers warmly, answer questions about Romeo M's services, explain pricing transparently, handle objections with grace, collect essential customer details, and seamlessly guide callers toward booking an appointment.

2. Core Business Offerings
Romeo M specializes in three main pillars of service:
- Business Communication: Consulting, messaging strategy, presentation coaching, and brand voice development to help businesses communicate with clarity and impact.
- Content Production: End-to-end digital content creation, including podcast production, video content scripting and strategy, copywriting, and multimedia storytelling.
- Digital Products: Strategy, creation, and launch support for digital products such as e-books, online courses, templates, membership sites, and downloadable assets.

3. Pricing Structure & Guidelines
When callers ask about pricing, maintain transparency while emphasizing value and customization:
- Consulting & Strategy: Starts at custom project scopes, typically beginning around $500 for initial communication audits and strategy sessions.
- Content Production: Monthly retainer packages typically range from $1,500 to $4,000 or more per month, depending on the volume and type of content (audio, video, or written).
- Digital Products Setup: Launch and productization packages usually range from $2,000 to $5,000, depending on platform setup and complexity.
- The "It Depends" Rule: Always explain that exact pricing depends on their specific project scope and goals. Pivot immediately to booking a brief discovery call with Romeo to get an accurate quote: "Because every brand and project is unique, Romeo customizes his quotes after a quick chat. Would you like me to reserve a spot for you to speak with him directly?"

4. Conversation Flow & Instructions
Step 1: The Warm Greeting
Always open with a sweet, inviting greeting.
Example: "Hi there! Thanks for calling Romeo M's studio. You've reached our digital assistant. How can we help with your content or business communication today?"
${topicHint ? `Note: The visitor clicked in with interest in "${topicHint}". Greet them warmly and acknowledge that right away.` : ""}

Step 2: Information Gathering & Needs Assessment
Listen actively to what the caller needs. If they are vague, gently prompt them: "Are you looking to revamp your business messaging, produce some engaging content, or launch a digital product?"
Keep responses concise and conversational.

Step 3: Handling Common Objections
- Objection: "It's too expensive / Romeo's rates are high."
  Response: "I completely understand budget is a huge factor. Romeo focuses on high-impact results that typically pay for themselves by driving real engagement and sales. If you'd like, we can schedule a quick discovery call to see what kind of custom package fits comfortably within your goals."
- Objection: "I'm not sure if I need this right now / I'm just looking around."
  Response: "No worries at all! Taking your time is smart. A lot of our clients started right where you are. Would it be helpful if I had Romeo send over a free digital guide or portfolio of past work so you can review it at your own pace?" (If they say yes, ask for their name and email and call sendPortfolioGuide.)
- Objection: "I need to talk to Romeo directly before committing."
  Response: "That is completely fair—Romeo loves chatting with potential collaborators. That's actually the best next step. Let's get a 15-minute introductory call on his calendar."

Step 4: Collecting Customer Details
Before finalizing an appointment or callback request, naturally collect:
1. Full Name ("May I have your name, please?")
2. Best Callback Number or Email ("And what's the best email or phone number to reach you at?")
3. Project Overview ("In just a quick sentence or two, what project are you hoping to work on with Romeo?")
Once you have all three details and a confirmed slot, call the bookDiscoveryCall tool to finalize the booking!

Step 5: Booking Appointments
Guide the caller toward securing a spot on the calendar.
Currently open discovery call slots: ${slotsText}.
Example: "I have an opening this Thursday afternoon or Friday morning for a quick discovery chat with Romeo. Which of those works better for you?"
Once confirmed and booked via bookDiscoveryCall, summarize the details warmly: "You're all set! I've booked your chat for [slot]. Romeo is looking forward to connecting with you, and you'll receive a confirmation shortly. Is there anything else I can help you with today?"

5. Voice & Behavioral Guardrails
- Keep It Concise: Voice callers lose patience with long monologues. Keep your turns short, around 2 to 3 sentences maximum, before checking in or handing the conversation back to the user.
- No Markdown or Formatting: Never speak or output formatting symbols like asterisks, bullet points, hashes, or brackets. Speak naturally as a warm human would.
- Graceful Fallbacks: If you don't understand the caller or they ask something outside your scope, use a polite pivot: "That's a great question for Romeo himself. Let me make sure he gets the details, and I can have him reach out to you directly. What's the best email address for that?"
- Active Listening Cues: Use natural verbal nods where appropriate, like "Got it," "Ah, I understand," or "Wonderful."
- Studio Contact Information: Romeo M's direct email is romeomoffice@gmail.com, studio hours are Monday through Friday, 9:00 AM to 6:00 PM Pacific Time.`;
}

const checkAvailabilityDecl: FunctionDeclaration = {
  name: "checkAvailability",
  description:
    "Checks Romeo M's currently open 15-minute discovery call time slots.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const bookDiscoveryCallDecl: FunctionDeclaration = {
  name: "bookDiscoveryCall",
  description:
    "Books a 15-minute discovery call with Romeo M after collecting the caller's full name, email or phone number, brief project overview, and preferred time slot.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: {
        type: Type.STRING,
        description: "The caller's full name.",
      },
      contact: {
        type: Type.STRING,
        description: "The caller's best email address or callback phone number.",
      },
      projectOverview: {
        type: Type.STRING,
        description:
          "A brief 1-2 sentence overview of the project or service they are interested in.",
      },
      slot: {
        type: Type.STRING,
        description:
          "The chosen appointment slot, e.g. 'Thursday at 2:00 PM PT' or 'Friday at 10:00 AM PT'.",
      },
    },
    required: ["fullName", "contact", "projectOverview", "slot"],
  },
};

const sendPortfolioGuideDecl: FunctionDeclaration = {
  name: "sendPortfolioGuide",
  description:
    "Queues Romeo M's free digital guide and portfolio of past work to be sent to a prospective client who is still exploring.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fullName: {
        type: Type.STRING,
        description: "The visitor's name.",
      },
      email: {
        type: Type.STRING,
        description: "The email address to send the guide and portfolio to.",
      },
      interest: {
        type: Type.STRING,
        description:
          "Which pillar they are most curious about (Business Communication, Content Production, Digital Products, or General).",
      },
    },
    required: ["email"],
  },
};

function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  source: "voice" | "form" = "voice"
): {
  result: Record<string, unknown>;
  booking?: Appointment;
  guideRequest?: GuideRequest;
} {
  if (name === "checkAvailability") {
    const slots = getAvailableSlots();
    return {
      result: {
        availableSlots:
          slots.length > 0
            ? slots
            : ["Next Tuesday at 10:00 AM PT", "Next Wednesday at 2:00 PM PT"],
      },
    };
  }

  if (name === "bookDiscoveryCall") {
    const fullName = String(args.fullName || "").trim() || "Studio Visitor";
    const contact = String(args.contact || "").trim() || "Pending contact";
    const projectOverview =
      String(args.projectOverview || "").trim() || "Discovery consultation";
    const requestedSlot =
      String(args.slot || "").trim() || getAvailableSlots()[0] || "Thursday at 2:00 PM PT";

    const booking: Appointment = {
      id: `RM-${Date.now().toString(36).toUpperCase()}`,
      fullName,
      contact,
      projectOverview,
      slot: requestedSlot,
      source,
      createdAt: new Date().toISOString(),
    };
    appointments.push(booking);
    return {
      result: {
        confirmed: true,
        appointmentId: booking.id,
        slot: booking.slot,
        message: `Confirmed ${booking.slot} for ${booking.fullName}.`,
      },
      booking,
    };
  }

  if (name === "sendPortfolioGuide") {
    const fullName = String(args.fullName || "").trim() || "Visitor";
    const email = String(args.email || "").trim();
    const interest = String(args.interest || "").trim() || "General Studio";
    const guideRequest: GuideRequest = {
      id: `GD-${Date.now().toString(36).toUpperCase()}`,
      fullName,
      email,
      interest,
      createdAt: new Date().toISOString(),
    };
    guideRequests.push(guideRequest);
    return {
      result: {
        queued: true,
        requestId: guideRequest.id,
        email,
        message: `Portfolio and digital guide queued for ${email}.`,
      },
      guideRequest,
    };
  }

  return { result: { error: `Unknown tool ${name}` } };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Studio availability & appointments API
  app.get("/api/studio/availability", (_req, res) => {
    res.json({
      availableSlots: getAvailableSlots(),
      bookedCount: appointments.length,
      studioEmail: "romeomoffice@gmail.com",
      hours: "Monday – Friday, 9:00 AM – 6:00 PM PT",
    });
  });

  app.post("/api/appointments", (req, res) => {
    const { fullName, contact, projectOverview, slot } = req.body ?? {};
    if (
      typeof fullName !== "string" ||
      fullName.trim().length < 2 ||
      typeof contact !== "string" ||
      contact.trim().length < 4 ||
      typeof projectOverview !== "string" ||
      projectOverview.trim().length < 5
    ) {
      res.status(400).json({
        error:
          "Please provide your full name, an email or phone number, and a short project summary.",
      });
      return;
    }

    const chosenSlot =
      typeof slot === "string" && slot.trim().length > 0
        ? slot.trim()
        : getAvailableSlots()[0] || "Thursday at 2:00 PM PT";

    const { booking } = executeToolCall(
      "bookDiscoveryCall",
      { fullName, contact, projectOverview, slot: chosenSlot },
      "form"
    );

    res.status(201).json({
      booking,
      availableSlots: getAvailableSlots(),
    });
  });

  app.post("/api/guide", (req, res) => {
    const { fullName, email, interest } = req.body ?? {};
    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    const { guideRequest } = executeToolCall("sendPortfolioGuide", {
      fullName,
      email,
      interest,
    });
    res.status(201).json({ guideRequest });
  });

  // Text chat fallback endpoint using gemini-4-hydrogen
  app.post("/api/chat", async (req, res) => {
    try {
      const { history = [], message, topic } = req.body ?? {};
      if (typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      const contents: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }> = [];

      if (Array.isArray(history)) {
        for (const turn of history) {
          if (
            turn &&
            (turn.role === "user" || turn.role === "model") &&
            typeof turn.text === "string" &&
            turn.text.trim()
          ) {
            contents.push({
              role: turn.role,
              parts: [{ text: turn.text }],
            });
          }
        }
      }
      contents.push({ role: "user", parts: [{ text: message.trim() }] });

      const config = {
        systemInstruction: buildSystemInstruction(
          typeof topic === "string" ? topic : undefined
        ),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        tools: [
          {
            functionDeclarations: [
              checkAvailabilityDecl,
              bookDiscoveryCallDecl,
              sendPortfolioGuideDecl,
            ],
          },
        ],
      };

      const response1 = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config,
      });

      let finalReply = response1.text || "";
      let booking: Appointment | undefined;
      let guideRequest: GuideRequest | undefined;

      const fnCalls = response1.functionCalls;
      if (fnCalls && fnCalls.length > 0) {
        const previousContent = response1.candidates?.[0]?.content;
        const toolResponseParts: Array<{
          functionResponse: {
            id?: string;
            name: string;
            response: Record<string, unknown>;
          };
        }> = [];

        for (const call of fnCalls) {
          const outcome = executeToolCall(
            call.name || "",
            (call.args as Record<string, unknown>) || {},
            "voice"
          );
          if (outcome.booking) booking = outcome.booking;
          if (outcome.guideRequest) guideRequest = outcome.guideRequest;
          toolResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name || "",
              response: outcome.result,
            },
          });
        }

        if (previousContent) {
          const response2 = await ai.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: [
              ...contents,
              previousContent,
              { role: "user", parts: toolResponseParts },
            ],
            config,
          });
          finalReply = response2.text || finalReply;
        }
      }

      res.json({
        reply: finalReply.replace(/[*_`#]/g, "").trim(),
        booking,
        guideRequest,
        availableSlots: getAvailableSlots(),
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to reach assistant.";
      res.status(500).json({ error: msg });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const host = request.headers.host || "localhost";
    const reqUrl = new URL(request.url || "/", `http://${host}`);
    if (reqUrl.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket, req) => {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);
    const topic = reqUrl.searchParams.get("topic") || undefined;

    let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let closed = false;

    const sendJson = (payload: Record<string, unknown>) => {
      if (!closed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: buildSystemInstruction(topic),
          tools: [
            {
              functionDeclarations: [
                checkAvailabilityDecl,
                bookDiscoveryCallDecl,
                sendPortfolioGuideDecl,
              ],
            },
          ],
        },
        callbacks: {
          onopen: () => {
            sendJson({ type: "ready" });
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;

            if (content?.inputTranscription?.text) {
              sendJson({
                type: "inputTranscript",
                text: content.inputTranscription.text,
              });
            }

            if (content?.outputTranscription?.text) {
              sendJson({
                type: "outputTranscript",
                text: content.outputTranscription.text,
              });
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendJson({
                  type: "audio",
                  audio: part.inlineData.data,
                });
              }
            }

            if (content?.interrupted) {
              sendJson({ type: "interrupted" });
            }

            if (content?.turnComplete) {
              sendJson({ type: "turnComplete" });
            }

            if (message.toolCall?.functionCalls?.length && session) {
              const responses = [];
              for (const call of message.toolCall.functionCalls) {
                const outcome = executeToolCall(
                  call.name || "",
                  (call.args as Record<string, unknown>) || {},
                  "voice"
                );
                if (outcome.booking) {
                  sendJson({
                    type: "bookingConfirmed",
                    booking: outcome.booking,
                    availableSlots: getAvailableSlots(),
                  });
                }
                if (outcome.guideRequest) {
                  sendJson({
                    type: "guideRequested",
                    guideRequest: outcome.guideRequest,
                  });
                }
                responses.push({
                  id: call.id,
                  name: call.name || "",
                  response: outcome.result,
                });
              }
              session.sendToolResponse({ functionResponses: responses });
            }
          },
          onerror: (err) => {
            sendJson({
              type: "error",
              message: err?.message || "Live voice connection interrupted.",
            });
          },
          onclose: () => {
            sendJson({ type: "closed" });
          },
        },
      });

      // Trigger immediate warm greeting from the receptionist
      const opener = topic
        ? `Hello! I just connected on Romeo M's website and I'm interested in ${topic}.`
        : "Hello! I just clicked to speak with Romeo M's receptionist.";

      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: opener }] }],
        turnComplete: true,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to initialize Gemini Live voice session.";
      sendJson({ type: "error", message });
      clientWs.close();
      return;
    }

    clientWs.on("message", (raw) => {
      if (!session || closed) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
        };

        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        } else if (msg.text && msg.text.trim()) {
          session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: msg.text.trim() }] }],
            turnComplete: true,
          });
        }
      } catch {
        // Ignore malformed frames
      }
    });

    clientWs.on("close", () => {
      closed = true;
      try {
        session?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const hmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server },
        hmr: !hmrDisabled,
        watch: hmrDisabled ? null : {},
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Romeo M Studio server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
