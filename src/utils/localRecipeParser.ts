import { Ingredient, ParsedRecipe, ParsedRecipeItem } from '../types';
import { findBestIngredientMatch } from './ingredientMatcher';

/**
 * Portuguese kitchen measurement conversions based on standard Brazilian culinary densities
 */
function convertKitchenMeasure(ingredientName: string, quantity: number, unitRaw: string): { qty: number; unit: 'g' | 'ml' | 'un' } {
  const normName = ingredientName.toLowerCase();
  const normUnit = unitRaw.toLowerCase().trim();

  // If already standard unit
  if (normUnit === 'kg') return { qty: quantity * 1000, unit: 'g' };
  if (normUnit === 'g' || normUnit === 'gr' || normUnit === 'gramas') return { qty: quantity, unit: 'g' };
  if (normUnit === 'l' || normUnit === 'litro' || normUnit === 'litros') return { qty: quantity * 1000, unit: 'ml' };
  if (normUnit === 'ml' || normUnit === 'mls') return { qty: quantity, unit: 'ml' };
  if (normUnit === 'un' || normUnit === 'unidade' || normUnit === 'unidades') return { qty: quantity, unit: 'un' };

  // Eggs or whole items
  if (normName.includes('ovo') || normName.includes('gema') || normName.includes('clara') || normUnit.includes('un') || normUnit.includes('ovos')) {
    return { qty: quantity, unit: 'un' };
  }

  // Cans / Cartons
  if (normUnit.includes('lata') || normUnit.includes('caixa') || normUnit.includes('cx')) {
    if (normName.includes('condensado')) return { qty: quantity * 395, unit: 'g' };
    if (normName.includes('creme de leite')) return { qty: quantity * 200, unit: 'g' };
    if (normName.includes('milho')) return { qty: quantity * 280, unit: 'g' };
    if (normName.includes('coco') || normName.includes('leite de coco')) return { qty: quantity * 200, unit: 'ml' };
    return { qty: quantity * 395, unit: 'g' };
  }

  // Cups (Xícaras / Copos)
  if (normUnit.includes('xic') || normUnit.includes('xíc') || normUnit.includes('copo')) {
    if (normName.includes('farinha') || normName.includes('trigo')) return { qty: Math.round(quantity * 120), unit: 'g' };
    if (normName.includes('açúcar') || normName.includes('acucar')) return { qty: Math.round(quantity * 180), unit: 'g' };
    if (normName.includes('óleo') || normName.includes('oleo') || normName.includes('leite') || normName.includes('água') || normName.includes('agua') || normName.includes('suco')) {
      return { qty: Math.round(quantity * 240), unit: 'ml' };
    }
    if (normName.includes('chocolate') || normName.includes('cacau') || normName.includes('nescau')) {
      return { qty: Math.round(quantity * 90), unit: 'g' };
    }
    if (normName.includes('amido') || normName.includes('maizena')) return { qty: Math.round(quantity * 100), unit: 'g' };
    if (normName.includes('manteiga') || normName.includes('margarina')) return { qty: Math.round(quantity * 200), unit: 'g' };
    if (normName.includes('fubá') || normName.includes('fuba')) return { qty: Math.round(quantity * 130), unit: 'g' };
    // Default cup
    return { qty: Math.round(quantity * 150), unit: 'g' };
  }

  // Tablespoons (Colheres de sopa)
  if (normUnit.includes('sopa') || (normUnit.includes('colher') && !normUnit.includes('chá') && !normUnit.includes('sobremesa') && !normUnit.includes('café'))) {
    if (normName.includes('fermento')) return { qty: Math.round(quantity * 14), unit: 'g' };
    if (normName.includes('manteiga') || normName.includes('margarina')) return { qty: Math.round(quantity * 15), unit: 'g' };
    if (normName.includes('açúcar') || normName.includes('farinha')) return { qty: Math.round(quantity * 15), unit: 'g' };
    if (normName.includes('óleo') || normName.includes('leite') || normName.includes('água')) return { qty: Math.round(quantity * 15), unit: 'ml' };
    return { qty: Math.round(quantity * 15), unit: 'g' };
  }

  // Teaspoons (Colheres de chá)
  if (normUnit.includes('chá') || normUnit.includes('cha')) {
    if (normName.includes('fermento') || normName.includes('bicarbonato')) return { qty: Math.round(quantity * 5), unit: 'g' };
    if (normName.includes('óleo') || normName.includes('essência') || normName.includes('baunilha')) return { qty: Math.round(quantity * 5), unit: 'ml' };
    return { qty: Math.round(quantity * 5), unit: 'g' };
  }

  // Dessert spoons (Colheres de sobremesa)
  if (normUnit.includes('sobremesa')) {
    return { qty: Math.round(quantity * 10), unit: 'g' };
  }

  // Pinch (Pitada)
  if (normUnit.includes('pitada')) {
    return { qty: 1, unit: 'g' };
  }

  // Default fallback
  return { qty: quantity, unit: 'g' };
}

/**
 * Extracts recipe metadata (name, yield, oven time, oven temp) and ingredients from raw text
 */
export function parseRecipeLocally(text: string, existingIngredients: Ingredient[]): ParsedRecipe {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    return { nome: 'Receita', rendimento: 12, tempo_min: 40, temp: '180', itens: [] };
  }

  // 1. Extract recipe name
  let recipeName = 'Bolo Caseiro';
  for (const line of lines) {
    const clean = line.replace(/^[#*-\s]+/, '').trim();
    if (
      clean.toLowerCase().startsWith('bolo') ||
      clean.toLowerCase().startsWith('torta') ||
      clean.toLowerCase().startsWith('receita de') ||
      clean.toLowerCase().startsWith('receita:') ||
      clean.toLowerCase().startsWith('massa de') ||
      clean.toLowerCase().startsWith('cobertura') ||
      clean.toLowerCase().startsWith('recheio')
    ) {
      recipeName = clean.replace(/^(receita\s*(de|:)?\s*)/i, '').trim();
      break;
    }
  }
  if (recipeName === 'Bolo Caseiro' && lines[0] && lines[0].length < 60) {
    recipeName = lines[0].replace(/^[#*-\s]+/, '').trim();
  }

  // 2. Extract slice yield (rendimento)
  let rendimento: number | null = null;
  const yieldMatch = text.match(/rendimento[:\s]*(\d+)\s*(fatias|porções|porcoes|pedaços|pedacos|unidades)?/i) ||
                     text.match(/rende[:\s]*(\d+)\s*(fatias|porções|pedaços)?/i) ||
                     text.match(/(\d+)\s*(fatias|porções|pedaços)/i);
  if (yieldMatch && yieldMatch[1]) {
    rendimento = parseInt(yieldMatch[1], 10);
  }
  if (!rendimento || rendimento <= 0) rendimento = 12;

  // 3. Extract oven time (tempo_min)
  let tempoMin: number | null = null;
  const timeMatch = text.match(/(\d+)\s*(a|-)\s*(\d+)\s*(minutos|min)/i) ||
                    text.match(/(\d+)\s*(minutos|min|m\b)/i) ||
                    text.match(/asse\s*por\s*(\d+)/i) ||
                    text.match(/forno\s*por\s*(\d+)/i);
  if (timeMatch) {
    if (timeMatch[3] && timeMatch[1]) {
      tempoMin = Math.round((parseInt(timeMatch[1], 10) + parseInt(timeMatch[3], 10)) / 2);
    } else if (timeMatch[1]) {
      tempoMin = parseInt(timeMatch[1], 10);
    }
  }
  if (!tempoMin || tempoMin <= 0) tempoMin = 40;

  // 4. Extract oven temperature
  let temp: string | null = null;
  const tempMatch = text.match(/(\d{3})\s*(a|-)\s*(\d{3})\s*(°c|graus|c)/i) ||
                    text.match(/(\d{3})\s*(°c|graus|c)/i) ||
                    text.match(/forno\s*(médio|baixo|alto|preaquecido\s*a\s*\d{3})/i);
  if (tempMatch) {
    if (tempMatch[3] && tempMatch[1]) {
      temp = `${tempMatch[1]}-${tempMatch[3]}`;
    } else if (tempMatch[1] && /^\d+$/.test(tempMatch[1])) {
      temp = tempMatch[1];
    } else {
      temp = '180';
    }
  } else {
    temp = '180';
  }

  // 5. Extract ingredients line by line
  const itens: ParsedRecipeItem[] = [];

  for (const line of lines) {
    const rawLine = line.replace(/^[•*\-\d.]+\s*/, '').trim();
    if (!rawLine || rawLine.length < 3) continue;

    // Skip section headers like "MODO DE PREPARO", "INSTRUÇÕES", "CALDA:"
    const lower = rawLine.toLowerCase();
    if (
      lower.includes('modo de preparo') ||
      lower.includes('instruções') ||
      lower.includes('rendimento') ||
      lower.includes('tempo de preparo') ||
      lower.includes('bata no liquidificador') ||
      lower.includes('preaqueça') ||
      lower.startsWith('dica')
    ) {
      continue;
    }

    // Match patterns like:
    // "3 ovos"
    // "2 xícaras de açúcar"
    // "1 1/2 xícara de farinha"
    // "1/2 xícara de óleo"
    // "200 g de manteiga"
    // "1 colher (sopa) de fermento"
    // "1 lata de leite condensado"
    const qtyRegex = /^(\d+[\s,/.]*\d*|\d+\/\d+|\d+)\s*(xícaras?|xic|copos?|colheres?\s*(?:\([a-z\s]+\)|de\s*[a-z]+)?|g|gr|kg|ml|l|unidades?|un|latas?|caixas?|cx|vidros?|pitadas?)?\s*(?:de\s+)?(.+)$/i;
    const match = rawLine.match(qtyRegex);

    if (match) {
      let rawQtyStr = match[1].trim();
      let rawUnit = match[2] ? match[2].trim() : 'un';
      let ingredientName = match[3].trim();

      // Clean ingredient name
      ingredientName = ingredientName.replace(/\(.*?\)/g, '').replace(/,\s*opcional.*/i, '').trim();

      // Parse fraction like "1/2" or "1 1/2"
      let numericQty = 1;
      if (rawQtyStr.includes(' ')) {
        const parts = rawQtyStr.split(' ');
        const whole = parseFloat(parts[0]) || 0;
        const frac = parts[1]?.split('/') || [];
        const fracVal = frac.length === 2 ? (parseFloat(frac[0]) || 0) / (parseFloat(frac[1]) || 1) : 0;
        numericQty = whole + fracVal;
      } else if (rawQtyStr.includes('/')) {
        const frac = rawQtyStr.split('/');
        numericQty = (parseFloat(frac[0]) || 0) / (parseFloat(frac[1]) || 1);
      } else {
        numericQty = parseFloat(rawQtyStr.replace(',', '.')) || 1;
      }

      if (numericQty <= 0) numericQty = 1;

      // Convert kitchen measures
      const converted = convertKitchenMeasure(ingredientName, numericQty, rawUnit);

      // Match against existing registered ingredients intelligently
      const matchedIng = findBestIngredientMatch(ingredientName, converted.unit, existingIngredients);

      itens.push({
        nome: matchedIng ? matchedIng.name : capitalize(ingredientName),
        qtd: converted.qty,
        unidade: matchedIng?.unit ? (matchedIng.unit as 'g' | 'ml' | 'un') : converted.unit,
        id: matchedIng ? matchedIng.id : null,
      });
    }
  }

  return {
    nome: recipeName,
    rendimento,
    tempo_min: tempoMin,
    temp,
    itens,
  };
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
