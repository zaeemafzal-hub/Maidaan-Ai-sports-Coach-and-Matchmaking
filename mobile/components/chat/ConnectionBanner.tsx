import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socketService } from '../../services/socketService';

interface ConnectionBannerProps {
  /** Optional override for connection status */
  connected?: boolean;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ connected: propConnected }) => {
  const [connected, setConnected] = useState<boolean>(
    propConnected !== undefined ? propConnected : socketService.isConnected()
  );

  useEffect(() => {
    if (propConnected !== undefined) {
      setConnected(propConnected);
      return;
    }
    const unsubscribe = socketService.onConnectionChange((status) => {
      setConnected(status);
    });
    return () => unsubscribe();
  }, [propConnected]);

  if (connected) {
    return null;
  }

  return (
    <View className="w-full bg-[#E85D26]/15 border-b border-[#E85D26]/30 px-4 py-2 flex-row items-center justify-center">
      <Ionicons name="cloud-offline-outline" size={14} color="#E85D26" />
      <Text className="text-[#E85D26] text-xs font-semibold ml-2">
        Reconnecting to live chat...
      </Text>
    </View>
  );
};
