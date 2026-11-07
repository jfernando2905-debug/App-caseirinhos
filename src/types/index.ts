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
  stock?: number; // Quantidade atual em estoque (na unidade 'unit')
  minStock?: number; // Estoque mínimo desejado (se vazio, calculado a partir das receitas)
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

export interface RecipePackagingLink {
  packagingId: string;
  qty: number;
}

export interface RecipeSize {
  id: string;
  nome: string; // 'P', 'M', 'G', 'Festa', etc.
  k: number; // Recipe factor (1 = base, 2 = double, 0.5 = half)
  pack: number; // Packaging cost for this specific whole cake
  sell: number; // Manual selling price (if 0, suggested is used)
  packagings?: RecipePackagingLink[]; // Associated packaging items
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
  packagings?: RecipePackagingLink[];
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
  pago?: boolean; // Whether the order is paid
  pagoEm?: number; // Timestamp when payment was completed
  obs?: string;
  itens: OrderItem[];
  adicionais?: string; // Descrição de itens adicionais (topo de bolo, vela, morangos extras, etc.)
  valorAdicionais?: number; // Preço/valor dos adicionais (R$)
  criadoEm?: number;
}

export type PurchaseStatus = 'pendente' | 'comprado' | 'recebido';

export interface PurchaseItemStatus {
  status: PurchaseStatus;
  boughtAt?: number;
  receivedAt?: number;
  receivedQty?: number;
  receivedUnit?: Unit;
  addedStockAmount?: number;
  movementId?: string;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'entrada' | 'saida' | 'estorno' | 'ajuste';
  origin: 'Compra' | 'Producao' | 'Ajuste Manual' | 'Estorno Compra';
  qty: number; // Positive for entry, negative for exit/estorno
  unit: Unit;
  date: number; // timestamp
  note?: string;
  shoppingItemId?: string;
}

export type PackagingCategory =
  | 'Caixas para Bolos'
  | 'Caixas para Doces'
  | 'Forminhas'
  | 'Bases e Suportes'
  | 'Sacolas'
  | 'Potes e Embalagens Plásticas'
  | 'Papel Manteiga'
  | 'Etiquetas e Adesivos'
  | 'Outros';

export interface PackagingItem {
  id: string;
  name: string;
  category: string;
  dimension?: string; // e.g. "15x15x12 cm"
  unit: string; // 'un', 'pacote', 'cento', 'rolo', 'kg', 'm'
  stock: number; // Quantidade atual em estoque
  minStock: number; // Estoque mínimo para alerta/reposição
  price?: number; // Custo unitário / do pacote (R$)
  unitPrice?: number; // Alias for unit price
  size?: number; // Tamanho do pacote (ex: 100 un por pacote)
  supplier?: string; // Fornecedor (opcional)
  notes?: string; // Observações
  updatedAt?: number;
}

export interface PackagingMovement {
  id: string;
  packagingId: string;
  packagingName: string;
  type: 'entrada' | 'saida' | 'estorno' | 'ajuste';
  origin?: string; // 'Compra', 'Uso Manual', 'Ajuste Manual', 'Estorno Compra', 'Producao'
  reason?: string; // Reason description
  qty: number;
  unit?: string;
  date: number;
  note?: string;
  notes?: string;
  shoppingItemId?: string;
}

export interface AppData {
  ings: Ingredient[];
  recs: Recipe[];
  orders: Order[];
  cfg: AppSettings;
  packagings?: PackagingItem[];
  packagingMovements?: PackagingMovement[];
  shoppingStatuses?: Record<string, PurchaseItemStatus>;
  stockMovements?: StockMovement[];
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
