export type Unit = 'g' | 'kg' | 'ml' | 'L' | 'un';

export interface PriceHistoryEntry {
  d: number; // timestamp
  price: number;
  size: number;
  unit: Unit;
}

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  size: number;
  unit: Unit;
  hist: PriceHistoryEntry[];
  category?: string;
}

export interface RecipeItem {
  ing: string; // ingredient ID
  qty: number;
  unit: Unit;
}

export interface Equipment {
  nome: string;
  w: number;
  min: number;
}

export interface RecipeSize {
  id: string;
  nome: string; // 'P', 'M', 'G', 'Festa', etc.
  k: number; // Recipe factor (1 = base, 2 = double, 0.5 = half)
  pack: number; // Packaging cost for this specific whole cake
  sell: number; // Manual selling price (if 0, suggested is used)
}

export interface Recipe {
  id: string;
  name: string;
  yield: number; // Slice yield for base recipe (fator 1)
  margin: number; // Target margin percentage (e.g. 60)
  time: number; // Oven/cooking time in minutes
  temp: string; // Oven temperature (e.g. "180" or "180-200")
  fuel: number; // Other miscellaneous direct costs (R$)
  pack: number; // Default packaging cost
  sell: number; // Base selling price
  items: RecipeItem[];
  equip: Equipment[];
  sizes: RecipeSize[];
  category?: string;
  notes?: string;
}

export interface AppSettings {
  margin: number; // Default target margin (%)
  gasPrice: number; // Cylinder price (R$)
  gasKg: number; // Cylinder weight (kg)
  gasRate: number; // Stove/oven consumption (kg/h)
  elecPrice: number; // Electricity tariff (R$/kWh)
  ingOpen?: boolean; // Whether recipe ingredients list starts open
}

export type OrderStatus = 'pendente' | 'pronto' | 'entregue';

export interface OrderItem {
  tipo: string;
  tamanho: string;
  sabor: string;
  qtd: number;
  receitaId?: string; // Optional link to recipe
  valorUnitario?: number;
}

export interface Order {
  id: string;
  cliente: string;
  telefone?: string;
  entrega: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  valor?: number;
  sinal?: number;
  status: OrderStatus;
  obs?: string;
  itens: OrderItem[];
  criadoEm?: number;
}

export interface AppData {
  ings: Ingredient[];
  recs: Recipe[];
  orders: Order[];
  cfg: AppSettings;
}

export interface ParsedRecipeItem {
  nome: string;
  qtd: number;
  unidade: 'g' | 'ml' | 'un';
  id?: string | null;
}

export interface ParsedRecipe {
  nome: string;
  rendimento: number | null;
  tempo_min: number | null;
  temp: string | null;
  itens: ParsedRecipeItem[];
}
