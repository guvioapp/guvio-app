import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Cake } from "lucide-react-native";
import { useAppTheme } from "../context/AppTheme";
import { myBirthSet, setBirthDate } from "../services/cloud";
import { isCloud } from "../services/supabase";
import { FastStorage } from "../services/FastStorage";

const BLOCK_KEY = "guvio_age_block";

/**
 * Idade mínima de 13 anos. Pergunta a data de nascimento uma vez, depois do login
 * (vale para quem entrou por e-mail, Google ou Apple, e para contas antigas).
 * 13 a 17 anos: a conta vira privada. Menos de 13: não entra.
 */
export function AgeGate({ onBlocked }: { onBlocked: () => void }) {
  const { colors } = useAppTheme();
  const [need, setNeed] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minorNote, setMinorNote] = useState(false);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  useEffect(() => {
    // este aparelho já recebeu "menos de 13 anos": não deixa tentar de novo na hora
    const blockedAt = FastStorage.getItemSync<number>(BLOCK_KEY, 0);
    if (blockedAt && Date.now() - blockedAt < 24 * 3600e3) return onBlocked();
    isCloud()
      .then(c => (c ? myBirthSet() : true))
      .then(set => setNeed(set === false))
      .catch(() => {});
  }, []);

  const send = async () => {
    setError(null);
    const d = Number(day), m = Number(month), y = Number(year);
    const date = new Date(Date.UTC(y, m - 1, d));
    const valid = y > 1900 && m >= 1 && m <= 12 && d >= 1 && date.getUTCDate() === d && date.getTime() < Date.now();
    if (!valid) return setError("Confira a data: dia, mês e ano (ex.: 07 03 2004).");
    setBusy(true);
    try {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const r = await setBirthDate(iso);
      if (r === "minor") setMinorNote(true);
      else setNeed(false);
    } catch (e: any) {
      if (e?.message === "menor_13") {
        FastStorage.setItemSync(BLOCK_KEY, Date.now());
        setNeed(false);
        onBlocked();
        return;
      }
      setError(e?.message || "Não deu para salvar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  if (!need) return null;
  const field = [s.field, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];
  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.wrap, { backgroundColor: colors.bg }]}>
        <View style={s.card}>
          <Cake size={44} color={colors.text} strokeWidth={1.6} />
          {minorNote ? (
            <>
              <Text style={[s.title, { color: colors.text }]}>Sua conta ficou privada</Text>
              <Text style={[s.text, { color: colors.muted }]}>
                Como você tem menos de 18 anos, só quem você aprovar vê seus looks e stories. Dá para mudar isso nas Configurações.
              </Text>
              <Pressable onPress={() => setNeed(false)} style={s.btn}>
                <Text style={s.btnText}>Entendi</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[s.title, { color: colors.text }]}>Qual é a sua data de nascimento?</Text>
              <Text style={[s.text, { color: colors.muted }]}>
                O GUVIO é para maiores de 13 anos. Sua data de nascimento não aparece no seu perfil e só é usada para proteger quem tem menos de 18.
              </Text>
              <View style={s.row}>
                <TextInput
                  value={day}
                  onChangeText={v => {
                    const x = v.replace(/\D/g, "").slice(0, 2);
                    setDay(x);
                    if (x.length === 2) monthRef.current?.focus();
                  }}
                  placeholder="Dia"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[field, { width: 72 }]}
                  autoFocus
                />
                <TextInput
                  ref={monthRef}
                  value={month}
                  onChangeText={v => {
                    const x = v.replace(/\D/g, "").slice(0, 2);
                    setMonth(x);
                    if (x.length === 2) yearRef.current?.focus();
                  }}
                  placeholder="Mês"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[field, { width: 72 }]}
                />
                <TextInput
                  ref={yearRef}
                  value={year}
                  onChangeText={v => setYear(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Ano"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[field, { width: 96 }]}
                  onSubmitEditing={send}
                />
              </View>
              {error ? <Text style={{ color: "#FF3B30", marginTop: 10, textAlign: "center" }}>{error}</Text> : null}
              <Pressable onPress={send} disabled={busy} style={[s.btn, busy && { opacity: 0.7 }]}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Continuar</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, alignItems: "center" },
  title: { fontSize: 21, fontWeight: "800", textAlign: "center", marginTop: 14 },
  text: { textAlign: "center", marginTop: 8, lineHeight: 20 },
  row: { flexDirection: "row", gap: 10, marginTop: 22 },
  field: { height: 50, borderWidth: 1, borderRadius: 12, textAlign: "center", fontSize: 17, fontWeight: "600" },
  btn: { marginTop: 22, backgroundColor: "#0095F6", height: 48, borderRadius: 14, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 15 }
});
