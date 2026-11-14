import { useEffect, useState } from "react";
import { FastStorage } from "./FastStorage";

/**
 * Quem tem o selo de verificado. A lista é pequena, então o app guarda tudo de uma vez
 * (e no aparelho) e qualquer tela mostra o ✓ só pelo id ou @ da pessoa.
 */
const KEY = "guvio_verified_v1";
type Entry = { id: string; username: string };

let ids = new Set<string>();
let names = new Set<string>();
const subs = new Set<() => void>();

function apply(list: Entry[]) {
  ids = new Set(list.map(e => e.id));
  names = new Set(list.map(e => (e.username || "").toLowerCase()));
  subs.forEach(f => f());
}

export function loadVerifiedCache() {
  apply(FastStorage.getItemSync<Entry[]>(KEY, []));
}

export async function refreshVerified() {
  try {
    const { fetchVerifiedUsers } = require("./cloud") as typeof import("./cloud");
    const list = await fetchVerifiedUsers();
    FastStorage.setItemSync(KEY, list);
    apply(list);
  } catch {}
}

/** marca/desmarca na hora (depois que um admin muda o selo) */
export function setVerifiedLocal(entry: Entry, on: boolean) {
  const list = FastStorage.getItemSync<Entry[]>(KEY, []).filter(e => e.id !== entry.id);
  if (on) list.push(entry);
  FastStorage.setItemSync(KEY, list);
  apply(list);
}

export function isVerified(who: { id?: string | null; username?: string | null }) {
  if (who.id && ids.has(who.id)) return true;
  return !!who.username && names.has(who.username.replace(/^@/, "").toLowerCase());
}

export function useVerified(who: { id?: string | null; username?: string | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(n => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return isVerified(who);
}
