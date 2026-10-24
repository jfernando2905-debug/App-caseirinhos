import { Ingredient } from '../types';

/**
 * Normalizes text for comparison:
 * - Lowercase
 * - Removes accents/diacritics
 * - Removes punctuation
 * - Strips redundant spacing
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/gi, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Portuguese word singularization / stemming helper
 */
export function singularizePt(word: string): string {
  const w = normalizeText(word);
  if (!w || w.length <= 3) return w;

  // limoes -> limao, leoes -> leao, paes -> pao
  if (w.endsWith('oes') || w.endsWith('aes') || w.endsWith('aos')) {
    return w.slice(0, -3) + 'ao';
  }
  // pasteis -> pastel, aneis -> anel
  if (w.endsWith('eis')) {
    return w.slice(0, -3) + 'el';
  }
  // colheres -> colher, acucares -> acucar
  if (w.endsWith('res')) {
    return w.slice(0, -2);
  }
  // ovos -> ovo, fatias -> fatia, xicaras -> xicara, macas -> maca
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('is')) {
    return w.slice(0, -1);
  }

  return w;
}

/**
 * Common culinary synonyms and keyword clusters in Brazilian Portuguese
 */
const INGREDIENT_CLUSTERS: Record<string, string[]> = {
  ovo: ['ovo', 'ovos', 'gema', 'claras', 'clara', 'ovo branco', 'ovo vermelho', 'ovo caipira'],
  farinha: ['farinha', 'trigo', 'farinha de trigo', 'farinha especial', 'farinha tradicional', 'farinha sem fermento', 'farinha com fermento'],
  acucar: ['acucar', 'acucar refinado', 'acucar cristal', 'acucar demerara', 'acucar mascavo', 'acucar de confeiteiro', 'acucar impalpavel'],
  leite: ['leite', 'leite integral', 'leite desnatado', 'leite semidesnatado', 'leite de vaca', 'leite fresco'],
  manteiga: ['manteiga', 'manteiga sem sal', 'manteiga com sal', 'margarina', 'margarina qualy', 'margarina com sal', 'margarina sem sal', 'gordura vegetal'],
  fermento: ['fermento', 'fermento quimico', 'fermento em po', 'fermento biologico', 'fermento royal', 'fermento dona benta', 'po royal', 'bicarbonato'],
  chocolate: ['chocolate', 'chocolate em po', 'cacau', 'cacau em po', 'achocolatado', 'nescau', 'toddy', 'chocolate 50', 'chocolate 70', 'chocolate 32'],
  leite_condensado: ['leite condensado', 'leite moca', 'condensado'],
  creme_de_leite: ['creme de leite', 'creme leite', 'nata'],
  leite_de_coco: ['leite de coco', 'leite coco'],
  oleo: ['oleo', 'oleo de soja', 'oleo de girassol', 'oleo de milho', 'azeite', 'oleo vegetal'],
  baunilha: ['baunilha', 'essencia de baunilha', 'extrato de baunilha', 'aroma de baunilha'],
  amido: ['amido', 'amido de milho', 'maizena', 'maisena'],
  fuba: ['fuba', 'fuba mimoso', 'farinha de milho', 'milharina'],
  queijo: ['queijo', 'queijo ralado', 'parmesao', 'mussarela', 'requeijao', 'cream cheese'],
  sal: ['sal', 'sal refinado', 'sal marinho', 'pitada de sal'],
  canela: ['canela', 'canela em po', 'canela po'],
};

/**
 * Stopwords to ignore in ingredient comparison
 */
const STOP_WORDS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'em', 'com', 'sem', 'para', 'tipo',
  'marca', 'unidade', 'unidades', 'gramas', 'litros', 'colher', 'colheres',
  'xicara', 'xicaras', 'copo', 'copos', 'lata', 'latas', 'caixa', 'caixas',
  'pitada', 'pacote', 'vidro', 'fatia', 'fatias', 'fresco', 'fresca', 'gelado', 'morno'
]);

/**
 * Extracts meaningful keyword tokens from an ingredient name
 */
export function extractMeaningfulTokens(name: string): string[] {
  const norm = normalizeText(name);
  return norm
    .split(/\s+/)
    .map(singularizePt)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Finds the best matching existing ingredient for a given name and unit.
 * Uses exact match, singularized match, cluster similarity, and token overlap.
 */
export function findBestIngredientMatch(
  queryName: string,
  queryUnit: string | undefined,
  existingList: Ingredient[]
): Ingredient | undefined {
  if (!queryName || !existingList || existingList.length === 0) return undefined;

  const qNorm = normalizeText(queryName);
  const qSingular = qNorm.split(' ').map(singularizePt).join(' ');
  const qTokens = extractMeaningfulTokens(queryName);

  let bestMatch: Ingredient | undefined = undefined;
  let highestScore = 0;

  for (const item of existingList) {
    const itemNorm = normalizeText(item.name);
    const itemSingular = itemNorm.split(' ').map(singularizePt).join(' ');
    const itemTokens = extractMeaningfulTokens(item.name);

    // 1. Exact match (case & accents normalized)
    if (qNorm === itemNorm) {
      return item; // Immediate 100% match
    }

    // 2. Singularized match (e.g. "ovos" === "ovo")
    if (qSingular === itemSingular) {
      return item;
    }

    let score = 0;

    // 3. Cluster / Synonym match
    for (const cluster of Object.values(INGREDIENT_CLUSTERS)) {
      const qInCluster = cluster.some((c) => qNorm.includes(c) || c.includes(qNorm) || qTokens.includes(c));
      const itemInCluster = cluster.some((c) => itemNorm.includes(c) || c.includes(itemNorm) || itemTokens.includes(c));

      if (qInCluster && itemInCluster) {
        score = Math.max(score, 85);
        break;
      }
    }

    // 4. Substring containment
    if (qNorm.includes(itemNorm) || itemNorm.includes(qNorm)) {
      score = Math.max(score, 75);
    }
    if (qSingular.includes(itemSingular) || itemSingular.includes(qSingular)) {
      score = Math.max(score, 75);
    }

    // 5. Token overlap (Jaccard / intersection)
    if (qTokens.length > 0 && itemTokens.length > 0) {
      const commonTokens = qTokens.filter((t) => itemTokens.includes(t));
      if (commonTokens.length > 0) {
        const tokenRatio = (commonTokens.length * 2) / (qTokens.length + itemTokens.length);
        const tokenScore = Math.round(tokenRatio * 80);
        score = Math.max(score, tokenScore);
      }
    }

    // 6. Unit compatibility boost
    if (score > 60 && queryUnit && item.unit) {
      const uQ = queryUnit.toLowerCase().trim();
      const uItem = item.unit.toLowerCase().trim();
      if (uQ === uItem) {
        score += 10;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // Only accept confident matches (score >= 65)
  if (highestScore >= 65) {
    return bestMatch;
  }

  return undefined;
}
