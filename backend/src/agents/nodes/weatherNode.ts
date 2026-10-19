import { AgentState, AgentUpdate } from '../state.js';
import { getWeatherTool } from '../tools/getWeatherTool.js';
import { WEATHER_SYSTEM_PROMPT } from '../prompts/weather.js';
import { generateAIText, isAIConfigured } from '../../ai/providerFactory.js';
import { sharedRAGEngine } from '../../rag/ragEngine.js';

export async function weatherNode(state: AgentState): Promise<AgentUpdate> {
  const { area, sport, message } = state;

  try {
    // 1. Fetch deterministic weather metrics
    const weatherData = await getWeatherTool({
      area: area || 'Lahore',
      sport: sport || 'cricket',
    });

    const {
      location,
      temperatureC,
      condition,
      rainProbability,
      windSpeedKmh,
      recommendation,
      reason,
      isFallback,
    } = weatherData;

    // 2. Supplement with RAG guidance on weather suitability definitions
    let weatherSources: { source: string; section: string }[] = [];
    try {
      const ragResults = sharedRAGEngine.retrieve(`weather suitability recommendation ${recommendation}`, {
        filterSource: 'weather.md',
        topK: 1,
      });
      if (ragResults.length > 0) {
        weatherSources = [{ source: ragResults[0].source, section: ragResults[0].section }];
      }
    } catch {
      // Non-fatal
    }

    // 3. Format human-friendly explanation with LLM if available
    if (isAIConfigured() && process.env.NODE_ENV !== 'test') {
      try {
        const prompt = `User Query: "${message}"
Deterministic Weather Telemetry:
- Location: ${location}
- Temperature: ${temperatureC}°C
- Condition: ${condition}
- Rain Probability: ${rainProbability}%
- Wind Speed: ${windSpeedKmh} km/h
- Official Recommendation: ${recommendation}
- Reason: ${reason}

Explain this weather condition clearly to the player. Respect the official recommendation (${recommendation}) without changing it.`;

        const result = await generateAIText({systemPrompt: WEATHER_SYSTEM_PROMPT, message: prompt, temperature: 0.2, maxTokens: 300});

        const reply = result.message.trim();
        if (reply) {
          return {
            response: reply,
          synthesis: {provider: result.provider, usedBackup: result.usedBackup ?? false},
            sources: weatherSources,
            toolResult: {
              tool: 'getWeatherForecastTool',
              ...weatherData,
            },
          };
        }
      } catch (err) {
        // Fallback to deterministic template below
      }
    }

    // Deterministic explanation template
    const recDisplay =
      recommendation === 'OUTDOOR_SUITABLE'
        ? '✅ Excellent for outdoor play'
        : recommendation === 'CAUTION'
        ? '⚠️ Caution advised for outdoor play'
        : '🌧️ Indoor court preferred';

    const explanation = `**Weather for ${location}**\n` +
      `🌡️ Temperature: ${temperatureC}°C (${condition})\n` +
      `🌧️ Rain Probability: ${rainProbability}%\n` +
      `💨 Wind Speed: ${windSpeedKmh} km/h\n` +
      `📌 Advisory: ${recDisplay}\n` +
      `📝 Details: ${reason}` +
      (isFallback ? '\n*(Note: Displaying regional seasonal baseline)*' : '');

    return {
      response: explanation,
      sources: weatherSources,
      toolResult: {
        tool: 'getWeatherForecastTool',
        ...weatherData,
      },
    };
  } catch (error: any) {
    return {
      response: 'Live weather telemetry is temporarily unavailable for this area. Please check local conditions before heading outdoors.',
      toolResult: {
        tool: 'getWeatherForecastTool',
        location: area || 'Lahore',
        temperatureC: 25,
        condition: 'Unknown',
        rainProbability: 0,
        windSpeedKmh: 0,
        recommendation: 'CAUTION',
        reason: 'Weather service telemetry temporarily unavailable.',
        timestamp: new Date().toISOString(),
        isFallback: true,
        error: error.message || 'Weather service unavailable',
      },
    };
  }
}
