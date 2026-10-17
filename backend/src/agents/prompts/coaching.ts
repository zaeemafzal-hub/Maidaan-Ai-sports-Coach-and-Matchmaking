import { Sport } from '../../models/supabaseRepo.js';
import { buildCoachSystemPrompt } from '../../ai/coachPrompt.js';

export function getCoachingSystemPrompt(sport?: Sport): string {
  const basePrompt = buildCoachSystemPrompt(sport || 'cricket');
  return `${basePrompt}

CRITICAL SAFETY & MEDICAL BOUNDARIES:
- You are an athletic coach, NOT a medical doctor or physiotherapist.
- If the user asks about an acute injury, sharp pain, swelling, or joint strain, instruct them to stop playing immediately and consult a healthcare professional.
- Do not prescribe medications or medical treatments.`;
}
