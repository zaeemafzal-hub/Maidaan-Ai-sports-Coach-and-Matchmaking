import { Sport, SkillLevel } from '../../models/supabaseRepo.js';
import { CreateMatchDraftPayload } from './types.js';

export function extractCreateMatchParams(
  message: string,
  stateSport?: Sport,
  stateArea?: string,
  stateSkill?: SkillLevel
): Partial<CreateMatchDraftPayload> {
  const normalized = message.toLowerCase();
  const result: Partial<CreateMatchDraftPayload> = {};

  // Sport
  if (stateSport) {
    result.sport = stateSport;
  } else {
    for (const s of ['cricket', 'football', 'badminton', 'padel'] as Sport[]) {
      if (normalized.includes(s)) {
        result.sport = s;
        break;
      }
    }
  }

  // Date
  if (normalized.includes('tomorrow')) {
    result.date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  } else if (normalized.includes('today') || normalized.includes('tonight')) {
    result.date = new Date().toISOString().split('T')[0];
  } else {
    const dateMatch = message.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
    if (dateMatch) {
      result.date = dateMatch[1];
    }
  }

  // Time
  const timeMatch = message.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    result.startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  } else {
    const ampmMatch = message.match(/\b(\d{1,2})\s*(pm|am)\b/i);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1], 10);
      const isPm = ampmMatch[2].toLowerCase() === 'pm';
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      result.startTime = `${hour.toString().padStart(2, '0')}:00`;
    }
  }

  // Area
  if (stateArea) {
    result.area = stateArea;
  } else {
    const commonAreas = ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Cantt', 'Bahria', 'Lahore'];
    for (const a of commonAreas) {
      if (normalized.includes(a.toLowerCase())) {
        result.area = a;
        break;
      }
    }
  }

  // Skill Level
  if (stateSkill) {
    result.skillLevel = stateSkill;
  } else {
    if (normalized.includes('beginner') || normalized.includes('novice')) {
      result.skillLevel = 'beginner';
    } else if (normalized.includes('intermediate') || normalized.includes('mid')) {
      result.skillLevel = 'intermediate';
    } else if (normalized.includes('advanced') || normalized.includes('expert')) {
      result.skillLevel = 'advanced';
    }
  }

  // Total Capacity
  const capMatch = message.match(/\b(\d{1,2})\s*(?:players|player|capacity|people|spots|slots)\b/i);
  if (capMatch) {
    result.totalCapacity = parseInt(capMatch[1], 10);
  }

  // Venue Name
  const venueMatch = message.match(/(?:at|venue:?)\s+([A-Za-z0-9\s]+?)(?:(?:\s+for|\s+on|\s+in|\s+tomorrow|\s+tonight|\s+at|\s+with|$|,))/i);
  if (venueMatch && venueMatch[1]) {
    const candidate = venueMatch[1].trim();
    if (candidate.length >= 3 && !['8pm', '7pm', '9pm', 'night', 'tomorrow', 'today'].includes(candidate.toLowerCase())) {
      result.venueName = candidate;
    }
  }

  // Title
  const titleMatch = message.match(/(?:called|titled|title:?)\s+["']?([^"'\n]+?)["']?(?:(?:\s+for|\s+on|\s+at|\s+tomorrow|$))/i);
  if (titleMatch && titleMatch[1]) {
    result.title = titleMatch[1].trim();
  } else if (result.area && result.sport) {
    result.title = `${result.area} ${result.sport.toUpperCase()} Friendly`;
  }

  // Format
  if (normalized.includes('7v7') || normalized.includes('7-a-side')) result.format = '7v7';
  else if (normalized.includes('5v5') || normalized.includes('futsal')) result.format = '5v5 Futsal';
  else if (normalized.includes('t10') || normalized.includes('tape ball') || normalized.includes('tape-ball')) result.format = 'T10 Tape-Ball';
  else if (normalized.includes('doubles')) result.format = 'Doubles';
  else if (normalized.includes('singles')) result.format = 'Singles';

  // Fee / Contribution
  const feeMatch = message.match(/(?:fee|contribution|pkr|rs\.?)\s*(\d+)/i);
  if (feeMatch) {
    result.contributionPerPlayer = parseInt(feeMatch[1], 10);
  }

  return result;
}
