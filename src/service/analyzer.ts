// src/services/aiAnalyzer.ts

import { GoogleGenAI, Type } from '@google/genai'; // 1. Import 'Type' for schema definition
import { TrendItem, AIAnalysisResult } from '../types';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

// Load and manage multiple API keys (This logic remains the same)
const apiKeys: string[] = Object.keys(process.env)
  .filter(key => key.startsWith('GEMINI_API_KEY_'))
  .map(key => process.env[key]!)
  .filter(Boolean);

if (apiKeys.length === 0) {
  logger.warn('No API keys found in the .env file with the format GEMINI_API_KEY_...');
} else {
  logger.info(`Successfully loaded ${apiKeys.length} API keys for rotation.`);
}

let currentKeyIndex = 0;

function getNextApiKey(): string | undefined {
  if (apiKeys.length === 0) throw new Error('No available API keys.');
  const key = apiKeys[currentKeyIndex % apiKeys.length];
  currentKeyIndex++;
  return key;
}

// 2. Define the exact JSON structure we expect from the AI
const aIResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.NUMBER },
      saas_potential_score: { type: Type.NUMBER },
    },
    required: ['id', 'saas_potential_score'],
  },
};


/**
 * (SaaS Potential - Official Structured Output) Analyzes trends in batches and returns a 0-100 SaaS potential score.
 */
export async function analyzeCommercialIntentBatch(trends: TrendItem[]): Promise<AIAnalysisResult[] | null> {
  if (apiKeys.length === 0) {
    logger.error('API key pool is empty. Cannot perform analysis.');
    return null;
  }

  const inputForAI = trends.map((trend, index) => ({
    id: index,
    title: trend.title,
    breakdown: trend.breakdown,
  }));

  // 3. The prompt is now much simpler. We removed all instructions about JSON formatting.
  // const prompt = `
  //   You are an analyst looking for new Web SaaS or Tool ideas.
  //   Analyze the "SaaS Potential" for a list of Google search trends and assign a score from 0 to 100.
  //   Focus ONLY on the 'title' and its 'breakdown' terms.

  //   **Your Goal:** Identify search trends that indicate a user is looking for a digital tool or software solution to solve a problem. Ignore e-commerce/shopping intent and pure informational/news queries.

  //   **Scoring Guide for SaaS Potential:**
  //   - **91-100 (Very High Potential):** User is explicitly looking for a software tool. Keywords: "editor", "generator", "converter", "calculator", "solver", "[competitor] alternative", etc.
  //   - **61-90 (High Potential):** User has a problem that can be solved by a tool. Keywords: "how to remove background", "create a resume", etc.
  //   - **31-60 (Moderate Potential):** Topic is related to a professional field where tools are used, but the query is broad. e.g., "what is SEO".
  //   - **0-30 (Low or No Potential):** E-commerce, news, celebrities, facts. Keywords like "buy", "price", "reviews" for physical products, celebrity names, or news events should get a VERY LOW score.

  //   ---
  //   **CRITICAL EXAMPLES:**
  //   - A search for "pdf editor online" has VERY HIGH potential (95).
  //   - A search for "september playstation plus games" has VERY LOW potential (15).
  //   - A search for "bills depth chart" has VERY LOW potential (10).
  //   - A search for "buy macbook pro" has VERY LOW potential (5).
  //   - A search for "nyt mini crossword" has VERY HIGH potential (90).
  //   ---

  //   **Input Data (JSON Array):**
  //   ${JSON.stringify(inputForAI, null, 2)}

  //   For EACH object in the input array, perform the analysis and provide a score.
  // `;

  const prompt = `
You are an analyst looking for new **AI coloring book content ideas**. 
Analyze the "Coloring Book Potential" for a list of Google search trends and assign a score from 0 to 100. 
Focus ONLY on the 'title' and its 'breakdown' terms. 

**Your Goal:** Identify search trends that indicate a popular **character, theme, or visual motif** that could work well as coloring book material. 
Ignore purely textual, news-related, or non-visual topics. 

**Scoring Guide for Coloring Book Potential:**
- **91-100 (Very High Potential):** Explicitly a visual/character-based search. Popular mascots, IPs, cartoon characters, anime figures, fantasy creatures, etc. 
  Examples: "labubu", "hellokitty", "sanrio", "pokemon", "brainrot meme character".
- **61-90 (High Potential):** Strong visual theme but less direct. Objects, styles, or concepts that can inspire coloring pages. 
  Examples: "mandala art", "kawaii food", "fantasy castle", "halloween pumpkin".
- **31-60 (Moderate Potential):** Related to aesthetics or design but broad/abstract. 
  Examples: "aesthetic wallpapers", "spring vibes", "ocean animals".
- **0-30 (Low or No Potential):** Non-visual, news, products, or informational-only searches. 
  Examples: "buy iphone", "weather tomorrow", "stock market news".

---
**CRITICAL EXAMPLES:**
- A search for "labubu" → VERY HIGH potential (95).
- A search for "hellokitty coloring pages" → VERY HIGH potential (98).
- A search for "brainrot characters" → VERY HIGH potential (92).
- A search for "resume template" → VERY LOW potential (5).
- A search for "bills depth chart" → VERY LOW potential (10).
- A search for "september playstation plus games" → VERY LOW potential (15).

---
**Input Data (JSON Array):**
${JSON.stringify(inputForAI, null, 2)}

For EACH object in the input array, perform the analysis and provide a score.
`;


  try {
    const apiKey = getNextApiKey();

    if (!apiKey) {
        logger.error("Failed to get a valid API key from the pool.");
        return null;
      }
    const genAI = new GoogleGenAI({apiKey});

    // 4. Configure the model to use our schema for structured JSON output
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: aIResponseSchema,
      },
    });

    // 5. The response is guaranteed to be a valid JSON string, so we don't need to clean it.
    const aiResponseText = response.text;
    
    if (aiResponseText && typeof aiResponseText === 'string') {
        return JSON.parse(aiResponseText) as AIAnalysisResult[];
      } else {
        logger.error('AI response text was empty, undefined, or not a string.');
        return null;
      }

  } catch (error) {
    logger.error('Error in AI batch analysis with structured output', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}