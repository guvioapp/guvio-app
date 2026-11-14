import React from "react";
import { View } from "react-native";
import { BadgeCheck } from "lucide-react-native";
import { useVerified } from "../services/verified";

/** ✓ azul ao lado do nome de quem é verificado (não aparece para os outros) */
export function VerifiedBadge({ id, username, size = 14, force }: { id?: string | null; username?: string | null; size?: number; force?: boolean }) {
  const on = useVerified({ id, username });
  if (!on && !force) return null;
  return (
    <View style={{ marginLeft: 3, justifyContent: "center" }} accessibilityLabel="Verificado">
      <BadgeCheck size={size} color="#FFFFFF" fill="#0095F6" strokeWidth={2.4} />
    </View>
  );
}
