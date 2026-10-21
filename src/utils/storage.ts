import { AppData, Ingredient, Recipe, AppSettings } from '../types';

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

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  const formatDateOffset = (daysAgo: number) => {
    return new Date(now - daysAgo * day).toISOString().slice(0, 10);
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
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedData();
      saveAppData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ings: Array.isArray(parsed.ings) ? parsed.ings : [],
      recs: Array.isArray(parsed.recs) ? parsed.recs : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      cfg: { ...DEFAULT_CONFIG, ...(parsed.cfg || {}) },
    };
  } catch (err) {
    console.error('Failed to load storage:', err);
    return getInitialSeedData();
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
