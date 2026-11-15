import { Platform, useWindowDimensions } from "react-native";

/**
 * Versão do site para computador (igual ao Instagram): só no navegador e com a janela larga.
 * - wide: barra lateral no lugar da barra de baixo (a partir de 768px)
 * - full: barra lateral com os nomes (a partir de 1264px); abaixo disso, só ícones
 * - side: coluna de sugestões ao lado do feed (a partir de 1160px)
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const web = Platform.OS === "web";
  const wide = web && width >= 768;
  return { width, wide, full: wide && width >= 1264, side: wide && width >= 1160 };
}

export const FEED_WIDTH = 560;
export const PAGE_WIDTH = 935;
