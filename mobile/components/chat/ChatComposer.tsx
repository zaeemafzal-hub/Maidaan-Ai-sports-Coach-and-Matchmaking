import React, { useRef, useEffect } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  sending?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onTypingStart,
  onTypingStop,
  sending = false,
  placeholder = 'Type a message...',
  maxLength = 500,
}) => {
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (text.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStart?.();
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTypingStop?.();
      }, 2000);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (isTypingRef.current) {
        onTypingStop?.();
      }
    };
  }, []);

  const canSend = value.trim().length > 0 && !sending;
  const isNearLimit = value.length >= maxLength - 50;

  return (
    <View className="p-3 bg-[#141518] border-t border-white/[0.08]">
      {isNearLimit && (
        <View className="pb-1.5 px-2 flex-row justify-end">
          <Text style={{ color: '#A0A5AD' }} className="text-[#A0A5AD] text-[10px] font-semibold">
            {value.length} / {maxLength}
          </Text>
        </View>
      )}
      <View className="flex-row items-end">
        <View className="flex-1 flex-row items-center px-3.5 py-2 rounded-xl bg-[#1B1D22] border border-white/[0.08] mr-2 min-h-[44px]">
          <TextInput
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#5C616A"
            multiline
            maxLength={maxLength}
            editable={!sending}
            style={{ color: '#FFFFFF' }}
            className="flex-1 text-white text-sm p-0 max-h-24"
            accessibilityLabel={placeholder}
          />
        </View>

        {/* Send Button */}
        <Pressable
          onPress={() => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            if (isTypingRef.current) {
              isTypingRef.current = false;
              onTypingStop?.();
            }
            onSend();
          }}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          className={`w-11 h-11 rounded-xl items-center justify-center transition-all ${
            canSend
              ? 'bg-[#E85D26] active:scale-95'
              : 'bg-[#1B1D22] border border-white/[0.08] opacity-50'
          }`}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#0C0D0E" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={canSend ? '#0C0D0E' : '#5C616A'}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
};
