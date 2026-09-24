const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const OpenAI = require("openai");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

exports.oybot = onRequest(
  {
    cors: true,
    region: "asia-southeast1",
    secrets: [OPENAI_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed.",
      });
    }

    try {
      const { message, history = [] } = req.body || {};

      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
          error: "Message is required.",
        });
      }

      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY.value(),
      });

      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (item) =>
                item &&
                (item.role === "user" || item.role === "assistant") &&
                typeof item.content === "string"
            )
            .slice(-20)
        : [];

      const conversation = [
        ...safeHistory,
        {
          role: "user",
          content: message.trim(),
        },
      ];

      const response = await openai.responses.create({
        model: "gpt-5.6-luna",

        instructions: `
You are OyBot, the AI assistant inside OyFound.

OyFound is a lost-and-found platform used by students,
parents, and administrators.

You are a general-purpose AI assistant.

You can answer questions about:
- OyFound
- lost and found
- school topics
- technology
- programming
- mathematics
- science
- history
- geography
- writing
- general knowledge
- explanations
- brainstorming
- everyday questions
- and other normal questions

Do not assume every question is about lost and found.

When the user asks a general question, answer the actual question.

Be helpful, clear, accurate, and conversational.

Use the conversation history when it is relevant.

If you do not know something, say so rather than inventing facts.

For medical, legal, financial, or other high-stakes topics,
provide general information and recommend consulting an
appropriately qualified professional when appropriate.

Never claim that you searched OyFound, found a lost item,
contacted someone, changed a record, or performed another
application action unless the application actually provided
you with a tool that performed that action.

You are OyBot.
`,

        input: conversation,
      });

      const answer = response.output_text?.trim();

      if (!answer) {
        return res.status(500).json({
          error: "OyBot returned an empty response.",
        });
      }

      return res.status(200).json({
        answer,
      });
    } catch (error) {
      logger.error("OyBot API error", error);

      return res.status(500).json({
        error: "Failed to generate OyBot response.",
      });
    }
  }
);