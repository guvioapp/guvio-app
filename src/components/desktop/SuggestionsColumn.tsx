import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../context/AppTheme";
import { FastImage } from "../FastImage";
import { VerifiedBadge } from "../VerifiedBadge";
import { UserProfile } from "../../data/mockData";
import { loadFollowedUsers, loadSavedProfile, loadSuggestions, saveFollowedUsers } from "../../services/storage";
import { openAccountSwitcher } from "../AccountSwitcher";

/** Coluna da direita na Home do computador: você + sugestões para seguir */
export function SuggestionsColumn({ onOpenProfile }: { onOpenProfile: (username: string) => void }) {
  const { colors } = useAppTheme();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [list, setList] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    loadSavedProfile().then(setMe).catch(() => {});
    loadSuggestions(6)
      .then(l => setList(l.slice(0, 6)))
      .catch(() => {});
    loadFollowedUsers().then(setFollowing).catch(() => {});
  }, []);

  const toggle = async (p: UserProfile) => {
    const id = p.id || p.username;
    const on = following.includes(id);
    const next = on ? following.filter(x => x !== id) : [...following, id];
    setFollowing(next);
    try {
      await saveFollowedUsers(next);
    } catch {
      setFollowing(following);
    }
  };

  return (
    <View style={s.col}>
      {me ? (
        <View style={s.row}>
          <Pressable onPress={() => onOpenProfile(me.username)}>
            <FastImage source={me.avatar} style={s.meAvatar} contentFit="cover" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[s.user, { color: colors.text }]} numberOfLines={1}>
                {me.username}
              </Text>
              <VerifiedBadge id={me.id} username={me.username} size={13} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>
              {me.displayName}
            </Text>
          </View>
          <Pressable onPress={openAccountSwitcher} hitSlop={6}>
            <Text style={s.link}>Mudar</Text>
          </Pressable>
        </View>
      ) : null}
      {list.length ? (
        <>
          <Text style={[s.head, { color: colors.muted }]}>Sugestões para você</Text>
          {list.map(p => {
            const on = following.includes(p.id || p.username);
            return (
              <View key={p.id || p.username} style={s.row}>
                <Pressable onPress={() => onOpenProfile(p.username)}>
                  <FastImage source={p.avatar} style={s.avatar} contentFit="cover" />
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={() => onOpenProfile(p.username)}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[s.user, { color: colors.text }]} numberOfLines={1}>
                      {p.username}
                    </Text>
                    <VerifiedBadge id={p.id} username={p.username} size={12} />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                    {p.location || "Sugestão para você"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => toggle(p)} hitSlop={6}>
                  <Text style={[s.link, on && { color: colors.text }]}>{on ? "Seguindo" : "Seguir"}</Text>
                </Pressable>
              </View>
            );
          })}
        </>
      ) : null}
      <Text style={[s.foot, { color: colors.muted }]}>© 2026 GUVIO · beta</Text>
    </View>
  );
}

const s = StyleSheet.create({
  col: { width: 320, paddingTop: 36, paddingLeft: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  meAvatar: { width: 46, height: 46, borderRadius: 23 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  user: { fontWeight: "700", fontSize: 14, flexShrink: 1 },
  link: { color: "#0095F6", fontWeight: "700", fontSize: 13 },
  head: { fontWeight: "700", fontSize: 14, marginTop: 18, marginBottom: 4 },
  foot: { fontSize: 11, marginTop: 28 }
});
