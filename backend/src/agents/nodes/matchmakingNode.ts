import { AgentState, AgentUpdate } from '../state.js';
import { searchMatchesTool } from '../tools/searchMatchesTool.js';
import { MATCHMAKING_SYSTEM_PROMPT } from '../prompts/matchmaking.js';
import { GoogleGenAI } from '@google/genai';
import { sharedRAGEngine } from '../../rag/ragEngine.js';

export async function matchmakingNode(state: AgentState): Promise<AgentUpdate> {
  const { sport, area, skillLevel, message } = state;

  // 1. Execute deterministic tool
  const searchResult = await searchMatchesTool({
    sport,
    area,
    skillLevel,
  });

  const { matches, totalFound } = searchResult;

  // 2. Supplement with RAG join-request guidance if user asks about joining
  let joinSources: { source: string; section: string }[] = [];
  let joinGuidance = '';
  const normalizedMsg = (message || '').toLowerCase();
  if (normalizedMsg.includes('join') || normalizedMsg.includes('how') || normalizedMsg.includes('request')) {
    try {
      const ragResults = sharedRAGEngine.retrieve(message, { filterSource: 'join-requests.md', topK: 1 });
      if (ragResults.length > 0) {
        joinSources = [{ source: ragResults[0].source, section: ragResults[0].section }];
        joinGuidance = '\n\n📌 **How to Join**: Tap any open fixture on the Discover tab to inspect squad details and tap "Request to Join". The team captain will review your application.';
      }
    } catch {
      // Non-fatal
    }
  }

  // If zero matches found: enforce strict anti-hallucination rule
  if (totalFound === 0) {
    const filtersMentioned = [
      sport ? `sport: ${sport}` : null,
      area ? `area: ${area}` : null,
      skillLevel ? `skill: ${skillLevel}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const noMatchText = (filtersMentioned
      ? `No open matches found matching your criteria (${filtersMentioned}) right now. Check back soon or broaden your search on the Discover tab!`
      : 'No open matches are currently scheduled. Check the Discover tab for newly listed games!') + joinGuidance;

    return {
      response: noMatchText,
      sources: joinSources.length > 0 ? joinSources : undefined,
      toolResult: searchResult,
    };
  }

  // 3. If matches found, synthesize response using Gemini if available, or deterministic summary
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && process.env.NODE_ENV !== 'test') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `User Request: "${message}"
Live Database Matches Found (${totalFound}):
${JSON.stringify(matches, null, 2)}

Provide an encouraging athletic summary of the best options found. Mention their sport, date/time, venue/area, open slots, and entry contribution. Remind the player they can view and join these fixtures directly in the Discover tab.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: MATCHMAKING_SYSTEM_PROMPT,
          temperature: 0.3,
          maxOutputTokens: 400,
        },
      });

      const reply = result.text?.trim();
      if (reply) {
        return {
          response: reply,
          sources: joinSources.length > 0 ? joinSources : undefined,
          toolResult: searchResult,
        };
      }
    } catch (err) {
      // Fallback to deterministic template below
    }
  }

  // Deterministic summary when LLM is unavailable
  const topMatches = matches.slice(0, 3);
  const matchLines = topMatches.map(
    (m, i) =>
      `${i + 1}. **${m.title}** (${m.sport.toUpperCase()})\n   📍 ${m.venueName}, ${m.area}\n   📅 ${m.date} at ${m.startTime}\n   👥 ${m.openSlots} open slot${m.openSlots > 1 ? 's' : ''} left | Fee: ${m.contributionPerPlayer ? 'PKR ' + m.contributionPerPlayer : 'Free'}`
  );

  const fallbackText = `Found ${totalFound} matching fixture${totalFound > 1 ? 's' : ''}:\n\n${matchLines.join('\n\n')}\n\nYou can view the full squad and join directly from the Discover tab.${joinGuidance}`;

  return {
    response: fallbackText,
    sources: joinSources.length > 0 ? joinSources : undefined,
    toolResult: searchResult,
  };
}
