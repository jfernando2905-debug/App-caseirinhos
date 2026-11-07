import { AppData, Ingredient, Recipe, AppSettings, Unit, PackagingItem, PackagingMovement } from '../types';
import { getLocalDateStr, getTomorrowDateStr } from './dateUtils';

export const STORAGE_KEY = 'custo-receitas-v1';

export const DEFAULT_CONFIG: AppSettings = {
  margin: 60,
  gasPrice: 115,
  gasKg: 13,
  gasRate: 0.3,
  elecPrice: 1.06,
  ingOpen: true,
};

export const uid = (): string => Math.random().toString(36).substring(2, 9);

export const INITIAL_PACKAGINGS: PackagingItem[] = [
  {
    id: 'pack_cx_15',
    name: 'Caixa para Bolo 15cm',
    category: 'Caixas para Bolos',
    dimension: '16 x 16 x 12 cm',
    unit: 'un',
    stock: 25,
    minStock: 10,
    price: 2.80,
    size: 1,
    supplier: 'Embalagens Silva',
    notes: 'Caixa reforçada com berço para bolo P.'
  },
  {
    id: 'pack_cx_20',
    name: 'Caixa para Bolo 20cm',
    category: 'Caixas para Bolos',
    dimension: '22 x 22 x 15 cm',
    unit: 'un',
    stock: 18,
    minStock: 10,
    price: 3.50,
    size: 1,
    supplier: 'Embalagens Silva',
    notes: 'Caixa branca com visor superior para bolo M.'
  },
  {
    id: 'pack_cx_25',
    name: 'Caixa para Bolo 25cm',
    category: 'Caixas para Bolos',
    dimension: '27 x 27 x 18 cm',
    unit: 'un',
    stock: 5,
    minStock: 10,
    price: 4.50,
    size: 1,
    supplier: 'Embalagens Silva',
    notes: 'Caixa alta reforçada para bolo G.'
  },
  {
    id: 'pack_base_20',
    name: 'Base MDF Disco 20cm',
    category: 'Bases e Suportes',
    dimension: '20 cm diâmetro (3mm)',
    unit: 'un',
    stock: 15,
    minStock: 8,
    price: 1.80,
    size: 1,
    supplier: 'Arte em MDF',
    notes: 'Base rígida para montagem de bolos.'
  },
  {
    id: 'pack_sacola_k',
    name: 'Sacola Kraft com Alça (M)',
    category: 'Sacolas',
    dimension: '30 x 25 x 15 cm',
    unit: 'pacote',
    stock: 0,
    minStock: 2,
    price: 35.00,
    size: 25,
    supplier: 'Papelaria Express',
    notes: 'Sacola kraft ecológica para transporte.'
  },
  {
    id: 'pack_etiqueta_logo',
    name: 'Etiquetas / Adesivos com Logomarca',
    category: 'Etiquetas e Adesivos',
    dimension: '5 cm diâmetro',
    unit: 'cento',
    stock: 4,
    minStock: 2,
    price: 22.00,
    size: 100,
    supplier: 'Gráfica Rápida',
    notes: 'Adesivos para lacrar embalagens.'
  },
  {
    id: 'pack_forminha_cupcake',
    name: 'Forminhas de Papel Cupcake nº 0',
    category: 'Forminhas',
    dimension: 'Número 0',
    unit: 'pacote',
    stock: 8,
    minStock: 3,
    price: 12.50,
    size: 100,
    supplier: 'Festa & Cia',
    notes: 'Forminhas forneáveis.'
  },
  {
    id: 'pack_pote_250',
    name: 'Pote Plástico 250ml (Bolo no Pote)',
    category: 'Potes e Embalagens Plásticas',
    dimension: '250 ml',
    unit: 'pacote',
    stock: 12,
    minStock: 5,
    price: 28.00,
    size: 50,
    supplier: 'Plásticos Práticos',
    notes: 'Potes transparentes com tampa.'
  }
];

export function getInitialSeedData(): AppData {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const ings: Ingredient[] = [
    {
      id: 'ing_farinha',
      name: 'Farinha de trigo',
      price: 5.5,
      size: 1,
      unit: 'kg',
      hist: [
        { d: now - 30 * day, price: 4.99, size: 1, unit: 'kg' },
        { d: now - 10 * day, price: 5.5, size: 1, unit: 'kg' },
      ],
      category: 'Secos',
    },
    {
      id: 'ing_acucar',
      name: 'Açúcar refinado',
      price: 4.8,
      size: 1,
      unit: 'kg',
      hist: [
        { d: now - 45 * day, price: 4.5, size: 1, unit: 'kg' },
        { d: now - 5 * day, price: 4.8, size: 1, unit: 'kg' },
      ],
      category: 'Secos',
    },
    {
      id: 'ing_ovos',
      name: 'Ovos médios',
      price: 15.0,
      size: 12,
      unit: 'un',
      hist: [
        { d: now - 20 * day, price: 14.0, size: 12, unit: 'un' },
        { d: now - 2 * day, price: 15.0, size: 12, unit: 'un' },
      ],
      category: 'Laticínios & Ovos',
    },
    {
      id: 'ing_oleo',
      name: 'Óleo de soja',
      price: 7.2,
      size: 900,
      unit: 'ml',
      hist: [{ d: now - 15 * day, price: 7.2, size: 900, unit: 'ml' }],
      category: 'Óleos & Gorduras',
    },
    {
      id: 'ing_cenoura',
      name: 'Cenoura fresca',
      price: 6.5,
      size: 1,
      unit: 'kg',
      hist: [{ d: now - 3 * day, price: 6.5, size: 1, unit: 'kg' }],
      category: 'Hortifrúti',
    },
    {
      id: 'ing_banana',
      name: 'Banana nanica/prata',
      price: 5.5,
      size: 1,
      unit: 'kg',
      hist: [{ d: now - 3 * day, price: 5.5, size: 1, unit: 'kg' }],
      category: 'Hortifrúti',
    },
    {
      id: 'ing_fermento',
      name: 'Fermento em pó químico',
      price: 4.9,
      size: 100,
      unit: 'g',
      hist: [{ d: now - 60 * day, price: 4.9, size: 100, unit: 'g' }],
      category: 'Secos',
    },
    {
      id: 'ing_chocolate',
      name: 'Chocolate em pó 50%',
      price: 18.9,
      size: 500,
      unit: 'g',
      hist: [{ d: now - 15 * day, price: 18.9, size: 500, unit: 'g' }],
      category: 'Confeitaria',
    },
    {
      id: 'ing_manteiga',
      name: 'Manteiga sem sal',
      price: 12.5,
      size: 200,
      unit: 'g',
      hist: [{ d: now - 10 * day, price: 12.5, size: 200, unit: 'g' }],
      category: 'Laticínios & Ovos',
    },
    {
      id: 'ing_leite',
      name: 'Leite integral',
      price: 5.2,
      size: 1,
      unit: 'L',
      hist: [{ d: now - 7 * day, price: 5.2, size: 1, unit: 'L' }],
      category: 'Laticínios & Ovos',
    },
    {
      id: 'ing_milho',
      name: 'Milho em conserva',
      price: 3.8,
      size: 280,
      unit: 'g',
      hist: [{ d: now - 12 * day, price: 3.8, size: 280, unit: 'g' }],
      category: 'Conservas',
    },
    {
      id: 'ing_fuba',
      name: 'Fubá mimoso',
      price: 4.2,
      size: 500,
      unit: 'g',
      hist: [{ d: now - 25 * day, price: 4.2, size: 500, unit: 'g' }],
      category: 'Secos',
    },
    {
      id: 'ing_requeijao',
      name: 'Requeijão cremoso',
      price: 8.9,
      size: 200,
      unit: 'g',
      hist: [{ d: now - 8 * day, price: 8.9, size: 200, unit: 'g' }],
      category: 'Laticínios & Ovos',
    },
  ];

  const recs: Recipe[] = [
    {
      id: 'rec_cenoura',
      name: 'Bolo de Cenoura com Calda de Chocolate',
      yield: 12,
      margin: 60,
      time: 40,
      temp: '180-200',
      fuel: 0.5, // forminha de papel / guardanapo
      pack: 3.5, // embalagem padrão
      sell: 0,
      items: [
        { ing: 'ing_cenoura', qty: 300, unit: 'g' },
        { ing: 'ing_ovos', qty: 3, unit: 'un' },
        { ing: 'ing_oleo', qty: 150, unit: 'ml' },
        { ing: 'ing_acucar', qty: 250, unit: 'g' },
        { ing: 'ing_farinha', qty: 300, unit: 'g' },
        { ing: 'ing_fermento', qty: 14, unit: 'g' },
        { ing: 'ing_chocolate', qty: 60, unit: 'g' },
        { ing: 'ing_manteiga', qty: 30, unit: 'g' },
        { ing: 'ing_leite', qty: 100, unit: 'ml' },
      ],
      equip: [
        { nome: 'Liquidificador', w: 600, min: 4 },
        { nome: 'Forno Elétrico / Luz', w: 50, min: 45 },
      ],
      sizes: [
        { id: uid(), nome: 'P (16cm)', k: 1, pack: 2.8, sell: 28.0 },
        { id: uid(), nome: 'M (20cm)', k: 1.6, pack: 3.5, sell: 42.0 },
        { id: uid(), nome: 'G (24cm)', k: 2.2, pack: 4.5, sell: 55.0 },
      ],
      category: 'Bolos Tradicionais',
      notes: 'Bater as cenouras com o óleo e ovos no liquidificador por 4 minutos até homogenizar bem.',
    },
    {
      id: 'rec_milho',
      name: 'Bolo Cremoso de Milho com Requeijão',
      yield: 12,
      margin: 60,
      time: 45,
      temp: '180',
      fuel: 0.5,
      pack: 3.5,
      sell: 0,
      items: [
        { ing: 'ing_milho', qty: 280, unit: 'g' },
        { ing: 'ing_ovos', qty: 3, unit: 'un' },
        { ing: 'ing_leite', qty: 240, unit: 'ml' },
        { ing: 'ing_oleo', qty: 120, unit: 'ml' },
        { ing: 'ing_acucar', qty: 200, unit: 'g' },
        { ing: 'ing_fuba', qty: 150, unit: 'g' },
        { ing: 'ing_requeijao', qty: 150, unit: 'g' },
        { ing: 'ing_fermento', qty: 14, unit: 'g' },
      ],
      equip: [
        { nome: 'Liquidificador', w: 600, min: 5 },
      ],
      sizes: [
        { id: uid(), nome: 'P (Caseirinho)', k: 0.6, pack: 2.2, sell: 22.0 },
        { id: uid(), nome: 'M (Padrão 20cm)', k: 1, pack: 3.5, sell: 35.0 },
        { id: uid(), nome: 'G (Família)', k: 1.8, pack: 4.5, sell: 50.0 },
      ],
      category: 'Bolos Cremosos',
      notes: 'Colocar colheradas de requeijão sobre a massa antes de ir ao forno.',
    },
  ];

  const todayStr = getLocalDateStr();
  const tomorrowStr = getTomorrowDateStr();

  const formatDateOffset = (daysAgo: number) => {
    return getLocalDateStr(new Date(now - daysAgo * day));
  };

  const orders = [
    {
      id: 'ord_1',
      cliente: 'Ana Carolina Souza',
      telefone: '(41) 99876-5432',
      entrega: todayStr,
      hora: '16:00',
      valor: 97.0,
      sinal: 40.0,
      status: 'pendente' as const,
      obs: "Topo de bolo 'Parabéns Lucca'. Massa bem fofinha!",
      itens: [
        { tipo: 'Bolo de aniversário', tamanho: 'M (Padrão 20cm)', sabor: 'Cenoura com Chocolate', qtd: 1, receitaId: 'rec_cenoura' },
        { tipo: 'Bolo caseiro', tamanho: 'P (Caseirinho)', sabor: 'Fubá com goiabada', qtd: 1 },
      ],
      criadoEm: now - 2 * day,
    },
    {
      id: 'ord_2',
      cliente: 'Mariana Mendes',
      telefone: '(41) 98765-4321',
      entrega: tomorrowStr,
      hora: '14:30',
      valor: 50.0,
      sinal: 25.0,
      status: 'pronto' as const,
      obs: 'Embalagem para presente com laço.',
      itens: [
        { tipo: 'Bolo caseiro', tamanho: 'G (Família)', sabor: 'Milho com requeijão', qtd: 1, receitaId: 'rec_milho' },
      ],
      criadoEm: now - 1 * day,
    },
    // Historical delivered orders across past months for profit accumulation tracking:
    {
      id: 'ord_hist_1',
      cliente: 'Juliana Costa',
      telefone: '(41) 99111-2233',
      entrega: formatDateOffset(85),
      hora: '15:00',
      valor: 85.0,
      sinal: 85.0,
      status: 'entregue' as const,
      obs: 'Entregue e aprovado pelo cliente.',
      itens: [
        { tipo: 'Bolo caseiro', tamanho: 'G (Família)', sabor: 'Milho com requeijão', qtd: 1, receitaId: 'rec_milho' },
        { tipo: 'Bolo caseiro', tamanho: 'M (Padrão 20cm)', sabor: 'Cenoura', qtd: 1, receitaId: 'rec_cenoura' },
      ],
      criadoEm: now - 87 * day,
    },
    {
      id: 'ord_hist_2',
      cliente: 'Carlos Eduardo Ramos',
      telefone: '(41) 98222-3344',
      entrega: formatDateOffset(55),
      hora: '17:30',
      valor: 110.0,
      sinal: 110.0,
      status: 'entregue' as const,
      obs: 'Bolo de aniversário para comemoração em família.',
      itens: [
        { tipo: 'Bolo de aniversário', tamanho: 'G (Família)', sabor: 'Cenoura com Calda de Chocolate', qtd: 1, receitaId: 'rec_cenoura' },
        { tipo: 'Cupcakes', tamanho: 'Único', sabor: 'Chocolate', qtd: 6 },
      ],
      criadoEm: now - 57 * day,
    },
    {
      id: 'ord_hist_3',
      cliente: 'Patrícia Oliveira',
      telefone: '(41) 97333-4455',
      entrega: formatDateOffset(42),
      hora: '11:00',
      valor: 95.0,
      sinal: 95.0,
      status: 'entregue' as const,
      obs: 'Café da tarde corporativo.',
      itens: [
        { tipo: 'Bolo caseiro', tamanho: 'M (Padrão 20cm)', sabor: 'Milho com requeijão', qtd: 2, receitaId: 'rec_milho' },
        { tipo: 'Bolo caseiro', tamanho: 'P (Caseirinho)', sabor: 'Fubá', qtd: 1 },
      ],
      criadoEm: now - 44 * day,
    },
    {
      id: 'ord_hist_4',
      cliente: 'Fernanda Lima',
      telefone: '(41) 99444-5566',
      entrega: formatDateOffset(20),
      hora: '16:00',
      valor: 135.0,
      sinal: 135.0,
      status: 'entregue' as const,
      obs: 'Dois bolos médios e um caseirinho.',
      itens: [
        { tipo: 'Bolo caseiro', tamanho: 'M (Padrão 20cm)', sabor: 'Cenoura com Calda de Chocolate', qtd: 2, receitaId: 'rec_cenoura' },
        { tipo: 'Bolo caseiro', tamanho: 'P (Caseirinho)', sabor: 'Milho com requeijão', qtd: 1, receitaId: 'rec_milho' },
      ],
      criadoEm: now - 22 * day,
    },
    {
      id: 'ord_hist_5',
      cliente: 'Beatriz Almeida',
      telefone: '(41) 98555-6677',
      entrega: formatDateOffset(5),
      hora: '14:00',
      valor: 75.0,
      sinal: 75.0,
      status: 'entregue' as const,
      obs: 'Entregue no condomínio.',
      itens: [
        { tipo: 'Bolo caseiro', tamanho: 'M (Padrão 20cm)', sabor: 'Cenoura com Calda de Chocolate', qtd: 1, receitaId: 'rec_cenoura' },
        { tipo: 'Bolo caseiro', tamanho: 'P (Caseirinho)', sabor: 'Milho com requeijão', qtd: 1, receitaId: 'rec_milho' },
      ],
      criadoEm: now - 6 * day,
    },
  ];

  return {
    ings,
    recs,
    orders,
    cfg: { ...DEFAULT_CONFIG },
    packagings: INITIAL_PACKAGINGS,
    packagingMovements: [],
  };
}

export function sanitizeAppData(data?: AppData | null): AppData {
  const seed = getInitialSeedData();
  if (!data) return seed;

  const rawIngs = Array.isArray(data.ings) ? data.ings : seed.ings;
  const rawRecs = Array.isArray(data.recs) ? data.recs : seed.recs;

  // 1. Sanitize ingredients (ensure Banana is in kg or g, not un)
  const sanitizedIngs = rawIngs.map((ing) => {
    if (!ing) return ing;
    const ingName = ing.name || '';
    const isBanana = ingName.toLowerCase().includes('banana');
    if (isBanana && ing.unit === 'un') {
      return {
        ...ing,
        unit: (ing.size > 10 ? 'g' : 'kg') as Unit,
        category: ing.category || 'Hortifrúti',
      };
    }
    return ing;
  }).filter(Boolean) as Ingredient[];

  // 2. Sanitize recipes (ensure Banana items in recipes use g instead of un)
  const sanitizedRecs = rawRecs.map((rec) => {
    if (!rec) return rec;
    const sanitizedItems = (rec.items || []).map((item) => {
      if (!item) return item;
      const matchedIng = sanitizedIngs.find((i) => i && i.id === item.ing);
      const matchedName = matchedIng?.name || '';
      const itemNome = (item as any).nome || (item as any).name || '';
      const isBanana =
        matchedName.toLowerCase().includes('banana') ||
        itemNome.toLowerCase().includes('banana');

      if (isBanana && item.unit === 'un') {
        const newQty = item.qty >= 15 ? item.qty : Math.round(item.qty * 120);
        return {
          ...item,
          qty: newQty,
          unit: 'g' as Unit,
        };
      }
      return item;
    }).filter(Boolean);

    return {
      ...rec,
      items: sanitizedItems,
    };
  }).filter(Boolean) as Recipe[];

  const rawPackagings = Array.isArray(data.packagings) && data.packagings.length > 0
    ? data.packagings
    : INITIAL_PACKAGINGS;

  return {
    ...data,
    ings: sanitizedIngs,
    recs: sanitizedRecs,
    orders: Array.isArray(data.orders) ? data.orders : seed.orders,
    cfg: { ...DEFAULT_CONFIG, ...(data.cfg || {}) },
    packagings: rawPackagings,
    packagingMovements: Array.isArray(data.packagingMovements) ? data.packagingMovements : [],
    shoppingStatuses: data.shoppingStatuses && typeof data.shoppingStatuses === 'object' ? data.shoppingStatuses : {},
    stockMovements: Array.isArray(data.stockMovements) ? data.stockMovements : [],
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = sanitizeAppData(getInitialSeedData());
      saveAppData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return sanitizeAppData(getInitialSeedData());
    }
    const loadedData: AppData = {
      ings: Array.isArray(parsed.ings) ? parsed.ings : [],
      recs: Array.isArray(parsed.recs) ? parsed.recs : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      cfg: { ...DEFAULT_CONFIG, ...(parsed.cfg || {}) },
      packagings: Array.isArray(parsed.packagings) && parsed.packagings.length > 0 ? parsed.packagings : INITIAL_PACKAGINGS,
      packagingMovements: Array.isArray(parsed.packagingMovements) ? parsed.packagingMovements : [],
      shoppingStatuses: parsed.shoppingStatuses && typeof parsed.shoppingStatuses === 'object' ? parsed.shoppingStatuses : {},
      stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
    };
    return sanitizeAppData(loadedData);
  } catch (err) {
    console.error('Failed to load storage:', err);
    try {
      return sanitizeAppData(getInitialSeedData());
    } catch {
      return getInitialSeedData();
    }
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function exportBackupJSON(data: AppData): void {
  const str = JSON.stringify(data, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `custo-receitas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
