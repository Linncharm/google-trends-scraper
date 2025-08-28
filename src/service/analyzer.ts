import { TrendItem, AIAnalysisResult } from '../types';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + API_KEY;

/**
 * (SaaS潜力版) 使用AI批量分析趋势，并返回0-100的SaaS产品潜力分数
 */
export async function analyzeCommercialIntentBatch(trends: TrendItem[]): Promise<AIAnalysisResult[] | null> {
    if (!API_KEY) {
      logger.error('Gemini API Key未配置');
      return null;
    }
  
    const inputForAI = trends.map((trend, index) => ({
      id: index,
      title: trend.title,
      breakdown: trend.breakdown,
    }));
  
    const prompt = `
    You are an analyst looking for new Web SaaS or Tool ideas.
    Analyze the "SaaS Potential" for a list of Google search trends and assign a score from 0 to 100.
    Focus ONLY on the 'title' and its 'breakdown' terms.

    **Your Goal:** Identify search trends that indicate a user is looking for a digital tool or software solution to solve a problem. Ignore e-commerce/shopping intent and pure informational/news queries.

    **Scoring Guide for SaaS Potential:**
    - **91-100 (Very High Potential):** User is explicitly looking for a software tool. Keywords: "editor", "generator", "converter", "calculator", "solver", "[competitor] alternative", etc.
    - **61-90 (High Potential):** User has a problem that can be solved by a tool. Keywords: "how to remove background", "create a resume", etc.
    - **31-60 (Moderate Potential):** Topic is related to a professional field where tools are used, but the query is broad. e.g., "what is SEO".
    - **0-30 (Low or No Potential):** E-commerce, news, celebrities, facts. Keywords like "buy", "price", "reviews" for physical products, celebrity names, or news events should get a VERY LOW score.

    ---
    **CRITICAL EXAMPLES:**
    - A search for "pdf editor online" has VERY HIGH potential (95), because the user is looking for a tool.
    - A search for "september playstation plus games" has VERY LOW potential (15), because the user is looking for NEWS/INFORMATION, not a tool.
    - A search for "bills depth chart" has VERY LOW potential (10), because it is a pure informational query for sports stats.
    - A search for "buy macbook pro" has VERY LOW potential (5), because it is an e-commerce query for a physical product.
    - A search for "nyt mini crossword" has VERY HIGH potential (90), because the user wants to play a web game/tool.
    ---

    **Input Data (JSON Array):**
    ${JSON.stringify(inputForAI, null, 2)}

    **Your Task:**
    For EACH object in the input array, using the scoring guide and examples above, perform the analysis.
    Return a single JSON array where each object contains the original "id" and a single key "saas_potential_score".
    
    **REQUIRED JSON Output Structure (A single JSON array):**
    [
      { "id": 0, "saas_potential_score": 95 },
      { "id": 1, "saas_potential_score": 15 }
    ]
    
    Provide ONLY the JSON array as your response. Do not include any other text, comments, or markdown formatting.
  `;
  
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
  
      if (!response.ok) { /* ... (错误处理不变) ... */ return null; }
  
      const data = await response.json() as any;
      const aiResponseText = data.candidates[0].content.parts[0].text
        .replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(aiResponseText) as AIAnalysisResult[];
    } catch (error) { /* ... (错误处理不变) ... */ return null; }
  }