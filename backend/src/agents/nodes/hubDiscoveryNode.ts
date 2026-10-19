import { AgentState, AgentUpdate } from '../state.js';
import { searchHubsTool } from '../tools/searchHubsTool.js';
import { HUB_DISCOVERY_SYSTEM_PROMPT } from '../prompts/hubDiscovery.js';
import { generateAIText, isAIConfigured } from '../../ai/providerFactory.js';
import { sharedRAGEngine } from '../../rag/ragEngine.js';

export async function hubDiscoveryNode(state: AgentState): Promise<AgentUpdate> {
  const { sport, area, message } = state;
  const normalizedMsg = (message || '').toLowerCase();
  const verifiedOnly = normalizedMsg.includes('verified');

  // 1. Execute deterministic hub search tool
  const hubResult = await searchHubsTool({
    sport,
    area,
    verifiedOnly: verifiedOnly ? true : undefined,
  });

  const { hubs, totalFound } = hubResult;

  // 2. Supplement with RAG context if user queries verification or hub rules
  let hubSources: { source: string; section: string }[] = [];
  if (normalizedMsg.includes('verified') || normalizedMsg.includes('verification') || normalizedMsg.includes('badge')) {
    try {
      const ragResults = sharedRAGEngine.retrieve(message, {
        filterSource: 'hub-verification.md',
        topK: 1,
      });
      if (ragResults.length > 0) {
        hubSources = [{ source: ragResults[0].source, section: ragResults[0].section }];
      }
    } catch {
      // Non-fatal
    }
  }

  // 3. Strict anti-hallucination check if zero hubs found
  if (totalFound === 0) {
    const filters: string[] = [];
    if (sport) filters.push(`sport: ${sport}`);
    if (area) filters.push(`area: ${area}`);
    if (verifiedOnly) filters.push('verified only');

    const filterDesc = filters.length > 0 ? ` matching (${filters.join(', ')})` : '';
    const noHubMsg = `No sports hubs or venues found${filterDesc}. Check back later as new facilities register on Maidaan!`;

    return {
      response: noHubMsg,
      sources: hubSources.length > 0 ? hubSources : undefined,
      toolResult: hubResult,
    };
  }

  // 4. Synthesize with Gemini if available in non-test mode
  if (isAIConfigured() && process.env.NODE_ENV !== 'test') {
    try {
      const prompt = `User Query: "${message}"
Live Database Hubs Found (${totalFound}):
${JSON.stringify(hubs, null, 2)}

Provide a clear, athletic summary of these sports hubs. Mention their venue name, location, courts count, and verified status. Remind the user they can view venue details on the Discover map.`;

      const result = await generateAIText({systemPrompt: HUB_DISCOVERY_SYSTEM_PROMPT, message: prompt, temperature: 0.2, maxTokens: 350});

      const reply = result.message.trim();
      if (reply) {
        return {
          response: reply,
          synthesis: {provider: result.provider, usedBackup: result.usedBackup ?? false},
          sources: hubSources.length > 0 ? hubSources : undefined,
          toolResult: hubResult,
        };
      }
    } catch {
      // Fallback to deterministic template
    }
  }

  // 5. Deterministic fallback response
  const hubLines = hubs.map((h, i) => {
    const verifiedBadge = h.isVerified ? ' [Verified Hub]' : '';
    const sportsList = h.sports.map((s) => s.toUpperCase()).join(', ');
    return `${i + 1}. **${h.name}**${verifiedBadge}\n   📍 ${h.location}\n   🏸 Sports: ${sportsList}\n   🏟️ ${h.courtCount} Court${h.courtCount > 1 ? 's' : ''}${h.contactNumber ? ` | 📞 ${h.contactNumber}` : ''}`;
  });

  const summary = `Found ${totalFound} sports venue${totalFound > 1 ? 's' : ''}:\n\n${hubLines.join('\n\n')}\n\nYou can explore venue details and courts on the Discover map.`;

  return {
    response: summary,
    sources: hubSources.length > 0 ? hubSources : undefined,
    toolResult: hubResult,
  };
}
