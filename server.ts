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

const aiLive = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "v1alpha",
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

  return `You are the live AI voice receptionist for Romeo M's creative studio.

Voice and Tone:
Speak in a warm, smooth, relaxed, and natural human voice—like a thoughtful studio coordinator on a real phone call.
Always use plain, clear, everyday English. Answer the caller's exact question directly and concretely. Never speak in riddles, metaphors, vague abstractions, or robotic scripts.
Keep every spoken response short and conversational—1 to 2 natural sentences (roughly 20 to 35 words) before pausing so the caller can respond.
Never read out markdown symbols, bullet points, asterisks, or stage directions. Use light natural cues like "Got it," "Of course," or "That makes sense."

What Romeo M Offers (three service pillars):
1. Business Communication: Consulting, messaging strategy, presentation coaching, and brand voice development to make a brand's message clear and persuasive.
2. Content Production: End-to-end podcast production, video scripting and strategy, copywriting, and multimedia storytelling.
3. Digital Products: Strategy, creation, and launch setup for e-books, online courses, templates, and membership sites.

Pricing Guidelines:
- Business Communication Consulting & Audits: Typically starts around $500 for initial communication audits and strategy sessions.
- Content Production Retainers: Typically $1,500 to $4,000 or more per month, depending on audio, video, or written volume.
- Digital Products Launch Packages: Typically $2,000 to $5,000, depending on platform setup and scope.
- Always explain that exact pricing depends on their specific project goals, and offer to book a quick 15-minute discovery call with Romeo for a tailored quote.

How to Handle Common Questions & Hesitations:
- If they feel rates might be high: Acknowledge budget matters, explain Romeo focuses on high-impact work that drives real engagement and revenue, and suggest a quick discovery call to explore a custom scope that fits.
- If they are just browsing or unsure: Reassure them there is zero pressure, and offer to have Romeo send over a free digital guide and portfolio of past work (if they say yes, ask for their name and email, then call sendPortfolioGuide).
- If they want to talk to Romeo directly: Agree warmly and guide them to book a 15-minute discovery call.

Booking a Discovery Call:
Open slots right now: ${slotsText}.
Before booking with the bookDiscoveryCall tool, naturally gather three things:
1. Their full name
2. Their best email address or callback phone number
3. A quick one-sentence overview of their project
Once you have those and they pick a time slot, call bookDiscoveryCall and confirm the day and time warmly.

Studio Details:
Direct email is romeomoffice@gmail.com. Studio hours are Monday through Friday, 9 AM to 6 PM Pacific Time.
If you are unsure about an unusual question, say you will pass it directly to Romeo and ask for the best email to follow up.
${topicHint ? `Context: The caller clicked in specifically asking about "${topicHint}". Greet them warmly and address that topic right away.` : `Start with a warm, simple greeting: "Hi there! Thanks for calling Romeo M's studio. How can I help with your communication, content, or digital product today?"`}`;
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
      session = await aiLive.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" },
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
          onopen: () => {},
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

      sendJson({ type: "ready" });

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
