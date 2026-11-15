import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import PostHog from "posthog-react-native";
import { FastStorage } from "./FastStorage";
import { BETA } from "./devMode";

/**
 * Medição do app:
 * - Sentry: erros e travamentos (sem dados pessoais).
 * - PostHog (servidor na Europa): uso e retenção, com o id da conta (nunca e-mail ou nome).
 * As chaves vêm das variáveis EXPO_PUBLIC_* do build; sem elas, nada é enviado.
 * O usuário pode desligar a medição de uso em Configurações.
 */
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || "";
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const OPT_OUT_KEY = "guvio_analytics_off";

let posthog: PostHog | null = null;
let started = false;

export function analyticsEnabled() {
  return !FastStorage.getItemSync<boolean>(OPT_OUT_KEY, false);
}

export function setAnalyticsEnabled(on: boolean) {
  FastStorage.setItemSync(OPT_OUT_KEY, !on);
  if (!posthog) return;
  if (on) posthog.optIn();
  else posthog.optOut();
}

export function initTelemetry() {
  if (started) return;
  started = true;
  const release = `${Constants.expoConfig?.version || "0"}+${Platform.OS}`;
  if (SENTRY_DSN && !__DEV__) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: BETA ? "beta" : "production",
        release,
        sendDefaultPii: false,
        tracesSampleRate: 0
      });
    } catch {}
  }
  if (POSTHOG_KEY && !__DEV__) {
    try {
      posthog = new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        captureAppLifecycleEvents: true,
        personProfiles: "identified_only"
      } as any);
      if (!analyticsEnabled()) posthog.optOut();
      posthog.register({ platform: Platform.OS, beta: BETA });
    } catch {
      posthog = null;
    }
  }
}

/** depois do login: liga os eventos à conta (só o id) */
export function identifyUser(userId: string) {
  try {
    Sentry.setUser({ id: userId });
  } catch {}
  try {
    posthog?.identify(userId);
  } catch {}
}

/** ao sair da conta */
export function resetTelemetry() {
  try {
    Sentry.setUser(null);
  } catch {}
  try {
    posthog?.reset();
  } catch {}
}

/** eventos principais (para medir retenção e quem posta) */
export type TrackEvent =
  | "signed_up"
  | "post_published"
  | "story_published"
  | "post_liked"
  | "comment_added"
  | "user_followed"
  | "message_sent"
  | "wardrobe_item_added"
  | "outfit_saved"
  | "camera_opened";

export function track(event: TrackEvent, props?: Record<string, string | number | boolean | null>) {
  try {
    posthog?.capture(event, props || undefined);
  } catch {}
}

export function reportError(error: unknown, context?: string) {
  try {
    Sentry.captureException(error, context ? { tags: { context } } : undefined);
  } catch {}
}
