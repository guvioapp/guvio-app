import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BadgeCheck } from "lucide-react-native";
import { ScreenHeader } from "./ScreenHeader";
import { useAppTheme } from "../context/AppTheme";
import { myVerification, requestVerification, VerificationStatus } from "../services/cloud";
import { isCloud } from "../services/supabase";
import { refreshVerified } from "../services/verified";
import { toast } from "./motion";

const CATEGORIES = ["Criador de conteúdo", "Influenciador de moda", "Marca / loja", "Estilista / designer", "Modelo", "Fotógrafo", "Imprensa", "Outro"];

/** Pedir o selo de verificado (um admin aprova no Painel do criador) */
export function VerificationView({ onBack }: { onBack: () => void }) {
  const { colors } = useAppTheme();
  const [status, setStatus] = useState<VerificationStatus | "loading">("loading");
  const [category, setCategory] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    isCloud()
      .then(c => (c ? myVerification() : null))
      .then(st => {
        setStatus(st);
        if (st === "verified") refreshVerified();
      })
      .catch(() => setStatus(null));
  }, []);

  const send = async () => {
    if (!category) return Alert.alert("Escolha uma categoria", "Diga o que melhor descreve você.");
    if (reason.trim().length < 15) return Alert.alert("Conte um pouco mais", "Explique em pelo menos uma frase por que sua conta deve ser verificada.");
    setSending(true);
    try {
      const r = await requestVerification(category, reason.trim(), link.trim());
      setStatus(r as VerificationStatus);
      toast("Pedido enviado");
    } catch (e: any) {
      Alert.alert("Não deu para enviar", e?.message || "Tente de novo.");
    } finally {
      setSending(false);
    }
  };

  const field = [s.input, { color: colors.text, borderColor: colors.border }];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Verificação" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <BadgeCheck size={54} color="#FFFFFF" fill="#0095F6" strokeWidth={2} />
          <Text style={[s.title, { color: colors.text }]}>Selo de verificado</Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 6 }}>
            O selo mostra que a conta é autêntica: um criador, marca ou pessoa conhecida da moda. Ele aparece ao lado do seu @ em todo o GUVIO.
          </Text>
        </View>

        {status === "loading" ? (
          <ActivityIndicator color={colors.text} />
        ) : status === "verified" || status === "approved" ? (
          <Text style={[s.box, { color: "#22C55E", backgroundColor: colors.surface }]}>Sua conta é verificada.</Text>
        ) : status === "pending" ? (
          <Text style={[s.box, { color: colors.text, backgroundColor: colors.surface }]}>
            Pedido enviado. A equipe do GUVIO vai analisar e você verá o selo no seu perfil se for aprovado.
          </Text>
        ) : (
          <>
            {status === "denied" ? (
              <Text style={{ color: "#FF3B30", marginBottom: 12 }}>Seu último pedido não foi aprovado. Você pode pedir de novo.</Text>
            ) : null}
            <Text style={[s.label, { color: colors.text }]}>Categoria</Text>
            <View style={s.chips}>
              {CATEGORIES.map(c => {
                const on = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[s.chip, { borderColor: on ? colors.text : colors.border, backgroundColor: on ? colors.text : "transparent" }]}
                  >
                    <Text style={{ color: on ? colors.bg : colors.text, fontSize: 13, fontWeight: "600" }}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[s.label, { color: colors.text }]}>Por que sua conta deve ser verificada?</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              placeholder="Ex.: sou estilista em Campinas e tenho uma marca de roupas..."
              placeholderTextColor={colors.muted}
              style={[field, { minHeight: 100, textAlignVertical: "top", paddingTop: 12 }]}
            />
            <Text style={[s.label, { color: colors.text }]}>Link (opcional)</Text>
            <TextInput
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              keyboardType="url"
              maxLength={200}
              placeholder="Instagram, site ou matéria sobre você"
              placeholderTextColor={colors.muted}
              style={field}
            />
            <Pressable onPress={send} disabled={sending} style={s.btn}>
              {sending ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: "700" }}>Enviar pedido</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", marginTop: 10 },
  label: { fontWeight: "700", marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 46 },
  btn: { backgroundColor: "#0095F6", height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 24 },
  box: { padding: 14, borderRadius: 14, textAlign: "center", fontWeight: "600" }
});
