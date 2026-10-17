import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation, AgentState } from './state.js';
import { classifyIntentNode } from './nodes/classifyIntent.js';
import { matchmakingNode } from './nodes/matchmakingNode.js';
import { coachingNode } from './nodes/coachingNode.js';
import { weatherNode } from './nodes/weatherNode.js';
import { fallbackNode } from './nodes/fallbackNode.js';
import { hubDiscoveryNode } from './nodes/hubDiscoveryNode.js';
import { captainNode } from './nodes/captainNode.js';
import { responseNode } from './nodes/responseNode.js';

/**
 * Official LangGraph StateGraph conditional router.
 */
function routeByIntent(
  state: AgentState
): 'matchmaking' | 'coaching' | 'weather' | 'general' | 'hubDiscovery' | 'captain' {
  switch (state.intent) {
    case 'MATCHMAKING':
      return 'matchmaking';
    case 'COACHING':
      return 'coaching';
    case 'WEATHER':
      return 'weather';
    case 'HUB_DISCOVERY':
      return 'hubDiscovery';
    case 'CAPTAIN':
      return 'captain';
    case 'GENERAL':
    default:
      return 'general';
  }
}

const workflow = new StateGraph(AgentStateAnnotation)
  .addNode('classifyIntent', classifyIntentNode)
  .addNode('matchmaking', matchmakingNode)
  .addNode('coaching', coachingNode)
  .addNode('weather', weatherNode)
  .addNode('general', fallbackNode)
  .addNode('hubDiscovery', hubDiscoveryNode)
  .addNode('captain', captainNode)
  .addNode('formatResponse', responseNode)
  .addEdge(START, 'classifyIntent')
  .addConditionalEdges('classifyIntent', routeByIntent, {
    matchmaking: 'matchmaking',
    coaching: 'coaching',
    weather: 'weather',
    general: 'general',
    hubDiscovery: 'hubDiscovery',
    captain: 'captain',
  })
  .addEdge('matchmaking', 'formatResponse')
  .addEdge('coaching', 'formatResponse')
  .addEdge('weather', 'formatResponse')
  .addEdge('general', 'formatResponse')
  .addEdge('hubDiscovery', 'formatResponse')
  .addEdge('captain', 'formatResponse')
  .addEdge('formatResponse', END);

export const maidaanAgentGraph = workflow.compile();

/**
 * High-level invocation helper for the Maidaan Agent Graph.
 */
export async function invokeMaidaanAgent(input: {
  userId: string;
  role?: any;
  message: string;
  requestId?: string;
}): Promise<AgentState> {
  const initialState = {
    userId: input.userId,
    role: input.role,
    message: input.message,
    requestId: input.requestId || `req_${Date.now()}`,
    startTime: Date.now(),
  };

  const finalState = await maidaanAgentGraph.invoke(initialState);
  return finalState;
}
