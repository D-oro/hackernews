import "dotenv/config";
import {SYSTEM_PROMPT} from "./prompts/systemPrompt";

//ToDo: Add support for multiple LLMs and models
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateWithGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  if (!prompt || prompt.trim() === "") {
    throw new Error("Prompt must be a non-empty string");
  }

  const generationConfig = {
    response_mime_type: "application/json",
    response_schema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: {type: "STRING"},
          rationale: {type: "STRING"},
        },
        required: ["title", "rationale"],
      },
    },
  };

  // toDo: Implement retry logic with exponential backoff for transient errors (e.g., network issues, rate limits)
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{text: SYSTEM_PROMPT}],
      },
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {parts?: Array<{text?: string}>};
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response text");

  let result;
  try {
    result = JSON.parse(text); 
    if (Array.isArray(result) && result.length > 3) {
      result = result.slice(0, 3);
    }
  } catch (err) {
    throw new Error("Invalid JSON returned by Gemini");
  }

  console.log(result);
  return result;
}
