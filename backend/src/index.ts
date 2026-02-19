import {
  HttpFunction,
  Request,
  Response,
} from "@google-cloud/functions-framework";
import {extractData} from "./extractData/extractData";
import { generateWithGemini } from "./llm/llm";
import { buildPrompt } from "./llm/prompts/buildPrompt";

export const helloWorld: HttpFunction = async (req: Request, res: Response) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  try {
    const urlInput = req.body?.url;

    if (!urlInput) {
      res.status(400).json({error: "Missing 'url' in request body."});
      return;
    }

    const validUrl = new URL(urlInput);
    const data = await extractData(validUrl);

    const prompt = buildPrompt(data);
    const titleIdeas = await generateWithGemini(prompt);

    res.status(200).json(titleIdeas);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({error: "Failed to process URL."});
  }
};
