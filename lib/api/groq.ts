import Groq from "groq-sdk";

type CosmicAdviceContext = {
  score?: number;
  location?: string;
};

const SYSTEM_PROMPT =
  "You are an expert Astronomer AI assistant named Cosmic Guide. Provide concise, clear, and accurate stargazing, equipment, and observational advice. Do not output markdown headings higher than h3.";

const FALLBACK_ADVICE =
  "Cosmic Guide is temporarily unavailable. For a productive session, begin with bright targets, allow your eyes 20–30 minutes to dark-adapt, and check cloud cover and wind before setting up equipment.";

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
    return FALLBACK_ADVICE;
  }

  const contextMessage = createContextMessage(context);
  const models = [
    "llama-3.3-70b-versatile",
    "llama3-80b-8192",
    "mixtral-8x7b-32768",
  ];

  try {
    for (const model of models) {
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
          return advice;
        }
      } catch (modelError) {
        console.error(`Groq model ${model} was unavailable:`, modelError);
      }
    }

    return FALLBACK_ADVICE;
  } catch (error) {
    console.error("Unable to generate Cosmic Guide advice:", error);
    return FALLBACK_ADVICE;
  }
}
