import React, { useEffect, useState } from "react";
import { View, Text } from "../theme/Primitives";
import { Ionicons } from "../theme/Icons";
import { socketService } from "../../services/socketService";

interface ConnectionBannerProps {
  /** Optional override for connection status */
  connected?: boolean;
  roomState?: "joining" | "joined" | "failed" | "retrying";
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  connected: propConnected,
  roomState,
}) => {
  const [connected, setConnected] = useState<boolean>(
    propConnected !== undefined ? propConnected : socketService.isConnected(),
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

  if (connected && (!roomState || roomState === "joined")) {
    return null;
  }

  return (
    <View className="w-full bg-[#E85D26]/15 border-b border-[#E85D26]/30 px-4 py-2 flex-row items-center justify-center">
      <Ionicons name="cloud-offline-outline" size={14} color="#E85D26" />
      <Text
        accessibilityLiveRegion="polite"
        className="text-[#E85D26] text-xs font-semibold ml-2"
      >
        {roomState === "failed"
          ? "Live room join failed. Messages can still use secure delivery; reopen to retry."
          : connected
            ? "Connected. Joining this room..."
            : "Reconnecting to live chat..."}
      </Text>
    </View>
  );
};
