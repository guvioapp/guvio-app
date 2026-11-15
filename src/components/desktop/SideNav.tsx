import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Heart, Home, Menu, MessageCircle, PlusSquare, Search, Shirt } from "lucide-react-native";
import { useAppTheme } from "../../context/AppTheme";
import { FastImage } from "../FastImage";
import { loadSavedProfile } from "../../services/storage";

export type SideItem = "home" | "search" | "wardrobe" | "direct" | "activity" | "create" | "profile" | "more";

/** Barra lateral da versão de computador (substitui a barra de baixo) */
export function SideNav({
  full,
  active,
  onPress,
  onLogoPress,
  unreadDm = 0,
  unreadActivity = false
}: {
  full: boolean;
  active: SideItem;
  onPress: (i: SideItem) => void;
  onLogoPress?: () => void;
  unreadDm?: number;
  unreadActivity?: boolean;
}) {
  const { colors } = useAppTheme();
  const [avatar, setAvatar] = useState<string | null>(null);
  useEffect(() => {
    loadSavedProfile()
      .then(p => setAvatar(p.avatar || null))
      .catch(() => {});
  }, [active]);

  const items: { id: SideItem; label: string; Icon: any }[] = [
    { id: "home", label: "Página inicial", Icon: Home },
    { id: "search", label: "Pesquisa", Icon: Search },
    { id: "wardrobe", label: "Guarda-roupa", Icon: Shirt },
    { id: "direct", label: "Mensagens", Icon: MessageCircle },
    { id: "activity", label: "Notificações", Icon: Heart },
    { id: "create", label: "Criar", Icon: PlusSquare }
  ];

  const Row = ({ id, label, children }: { id: SideItem; label: string; children: React.ReactNode }) => {
    const on = active === id;
    return (
      <Pressable
        onPress={() => onPress(id)}
        accessibilityLabel={label}
        style={({ hovered, pressed }: any) => [
          s.row,
          !full && { justifyContent: "center", paddingHorizontal: 0 },
          (hovered || pressed) && { backgroundColor: colors.surface }
        ]}
      >
        <View>{children}</View>
        {full ? <Text style={[s.label, { color: colors.text, fontWeight: on ? "800" : "500" }]}>{label}</Text> : null}
      </Pressable>
    );
  };

  return (
    <View style={[s.bar, { width: full ? 244 : 72, borderRightColor: colors.border, backgroundColor: colors.bg }]}>
      <Pressable onPress={onLogoPress} style={[s.logo, !full && { justifyContent: "center", paddingHorizontal: 0 }]} accessibilityLabel="GUVIO">
        <Image source={require("../../assets/logo.png")} style={s.logoImg} />
        {full ? <Text style={[s.logoText, { color: colors.text }]}>GUVIO</Text> : null}
      </Pressable>
      <View style={{ gap: 4 }}>
        {items.map(({ id, label, Icon }) => (
          <Row key={id} id={id} label={label}>
            <Icon size={26} color={colors.icon} strokeWidth={active === id ? 2.6 : 1.9} />
            {id === "direct" && unreadDm > 0 ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadDm > 9 ? "9+" : unreadDm}</Text>
              </View>
            ) : null}
            {id === "activity" && unreadActivity ? <View style={s.dot} /> : null}
          </Row>
        ))}
        <Row id="profile" label="Perfil">
          <FastImage
            source={avatar || ""}
            style={[s.avatar, { borderColor: active === "profile" ? colors.text : "transparent", backgroundColor: colors.surface }]}
            contentFit="cover"
          />
        </Row>
      </View>
      <View style={{ flex: 1 }} />
      <Row id="more" label="Mais">
        <Menu size={26} color={colors.icon} />
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { height: "100%", borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 22, paddingBottom: 20 },
  logo: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, height: 56, marginBottom: 18 },
  logoImg: { width: 32, height: 32, borderRadius: 9 },
  logoText: { fontSize: 22, fontWeight: "800", letterSpacing: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, height: 50, paddingHorizontal: 12, borderRadius: 10 },
  label: { fontSize: 15 },
  avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  badge: { position: "absolute", top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF3040", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  dot: { position: "absolute", top: 0, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF3040" }
});
