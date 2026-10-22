import React from 'react';
import { View, Text } from '../theme/Primitives';
import { Ionicons } from '../theme/Icons';
import { SourceMetadata } from '../../services/agentService';

interface SourceChipsProps {
  sources?: SourceMetadata[] | null;
  className?: string;
}

const cleanSourceLabel = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return 'Knowledge Source';

  const lower = raw.toLowerCase().trim();
  if (lower.includes('hub-verification')) return 'Hub Verification';
  if (lower.includes('join-requests')) return 'Join Requests';
  if (lower.includes('weather')) return 'Weather Rules';
  if (lower.includes('captain')) return 'Captain Rules';
  if (lower.includes('matchmaking')) return 'Matchmaking';
  if (lower.includes('roles')) return 'Roles & Permissions';
  if (lower.includes('safety')) return 'Safety Protocol';
  if (lower.includes('ai-coach')) return 'AI Coach Guidelines';
  if (lower.includes('faq')) return 'FAQ';

  // Fallback: strip file extension and clean separators
  const clean = raw.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
  return clean ? clean.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Knowledge Source';
};

const formatSourceTitle = (sourceItem?: SourceMetadata | string): string => {
  if (!sourceItem) return 'Knowledge Source';
  if (typeof sourceItem === 'string') return cleanSourceLabel(sourceItem);

  const candidate =
    sourceItem.title ||
    sourceItem.source ||
    sourceItem.id ||
    sourceItem.section ||
    '';

  return cleanSourceLabel(candidate);
};

export const SourceChips: React.FC<SourceChipsProps> = ({ sources, className = '' }) => {
  if (!sources || !Array.isArray(sources) || sources.length === 0) return null;

  // Deduplicate by formatted label
  const seen = new Set<string>();
  const uniqueItems: { key: string; label: string }[] = [];

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s) continue;
    const label = formatSourceTitle(s);
    if (!label || seen.has(label)) continue;
    seen.add(label);

    const identifier =
      typeof s === 'string'
        ? s
        : s.source || s.id || s.section || `src-${i}`;
    uniqueItems.push({ key: `${identifier}-${i}`, label });
  }

  if (uniqueItems.length === 0) return null;

  return (
    <View className={`mt-3 pt-2.5 border-t border-white/[0.06] ${className}`}>
      <View className="flex-row items-center mb-1.5">
        <Ionicons name="book-outline" size={12} color="#5C616A" />
        <Text className="text-[#5C616A] text-[10px] font-bold uppercase tracking-wider ml-1">
          Knowledge Sources
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {uniqueItems.map((item) => (
          <View
            key={item.key}
            className="flex-row items-center px-2 py-1 rounded-md bg-[#1B1D22] border border-white/[0.08]"
          >
            <View className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mr-1.5" />
            <Text className="text-[#A0A5AD] text-[11px] font-medium">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
