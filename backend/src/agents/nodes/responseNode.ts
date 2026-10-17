import { AgentState, AgentUpdate } from '../state.js';

export async function responseNode(state: AgentState): Promise<AgentUpdate> {
  const currentResponse = state.response?.trim() || '';

  if (!currentResponse) {
    return {
      response: 'I could not process your request at this time. Please try asking again.',
    };
  }

  return {
    response: currentResponse,
  };
}
