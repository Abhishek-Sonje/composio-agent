import { GoogleGenAI } from "@google/genai";

import type { AppConfig } from "../config/env.js";

export type GeminiClient = {
  client: GoogleGenAI;
  model: string;
};

export function createGeminiClient(
  config: Pick<AppConfig, "geminiApiKey" | "geminiModel">,
): GeminiClient {
  return {
    client: new GoogleGenAI({ apiKey: config.geminiApiKey }),
    model: config.geminiModel,
  };
}

