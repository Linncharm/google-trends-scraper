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
  
      **Your Goal:** Identify search trends that indicate a user is looking for a digital tool or software solution to solve a problem. Ignore e-commerce/shopping intent.
  
      **Scoring Guide for SaaS Potential:**
      - **91-100 (Very High Potential):** The user is explicitly looking for a software tool. Keywords include "editor", "generator", "converter", "calculator", "template", "checker", "solver", "remover", "downloader", "[competitor name] alternative", or specific tool types like "online mind map".
      - **61-90 (High Potential):** The user is describing a problem that can be solved by a tool. Keywords include "how to remove background", "convert jpg to png", "create a resume".
      - **31-60 (Moderate Potential):** The topic is related to a professional field where tools are used, but the query is more informational. (e.g., "what is SEO", "learn photoshop").
      - **0-30 (Low or No Potential):** This is for e-commerce, news, celebrities, facts, or navigational queries. Keywords like "buy", "price", "shipping", "near me", celebrity names, or specific locations should get a VERY LOW score.
  
      **Input Data (JSON Array):**
      ${JSON.stringify(inputForAI, null, 2)}
  
      **Your Task:**
      For EACH object in the input array, perform the analysis.
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