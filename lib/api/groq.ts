import Groq from "groq-sdk";

import { logger } from "@/lib/utils/logger";

type CosmicAdviceContext = {
  score?: number;
  location?: string;
};

const SYSTEM_PROMPT =
  "You are an expert Astronomer AI assistant named Cosmic Guide. Provide concise, clear, and accurate stargazing, equipment, and observational advice. Do not output markdown headings higher than h3.";

const FALLBACK_ADVICE =
  "Cosmic Guide is temporarily unavailable. For a productive session, begin with bright targets, allow your eyes 20–30 minutes to dark-adapt, and check cloud cover and wind before setting up equipment.";

const MODEL_FALLBACKS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
] as const;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

function createContextMessage(context?: CosmicAdviceContext): string | null {
  if (!context?.location && context?.score === undefined) {
    return null;
  }

  const details = [
    context.location ? `Location: ${context.location}` : null,
    context.score !== undefined
      ? `Current stargazing visibility score: ${Math.round(context.score)}/100`
      : null,
  ].filter(Boolean);

  return `Use this observational context when it is relevant: ${details.join(". ")}.`;
}

export async function generateCosmicAdvice(
  userPrompt: string,
  context?: CosmicAdviceContext,
): Promise<string> {
  if (!groq) {
    logger.warn("Cosmic Guide requested without a configured Groq API key.");
    return FALLBACK_ADVICE;
  }

  const contextMessage = createContextMessage(context);

  for (const [index, model] of MODEL_FALLBACKS.entries()) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(contextMessage
            ? [{ role: "system" as const, content: contextMessage }]
            : []),
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_completion_tokens: 600,
      });
      const advice = completion.choices[0]?.message?.content?.trim();

      if (advice) {
        if (index > 0) {
          logger.info("Cosmic Guide completed with a fallback Groq model.", {
            model,
            fallbackAttempt: index + 1,
          });
        }
        return advice;
      }

      logger.warn("Groq model returned an empty Cosmic Guide response.", {
        model,
        fallbackAttempt: index + 1,
      });
    } catch (error) {
      logger.warn("Groq model request failed; trying the next fallback.", {
        model,
        fallbackAttempt: index + 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.error("All configured Groq models failed for Cosmic Guide.");
  return FALLBACK_ADVICE;
}
