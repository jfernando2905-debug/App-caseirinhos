import { jsPDF } from 'jspdf';
import { Recipe, Ingredient, AppSettings, RecipeSize } from '../types';
import {
  calculateSizeMetrics,
  getItemCost,
  formatCurrency,
  formatNumber,
} from './calculations';

/**
 * Generates and downloads a complete, professional A4 technical sheet (Ficha Técnica) in PDF format.
 */
export function generateRecipePdf(
  recipe: Recipe,
  ingredients: Ingredient[],
  cfg: AppSettings
): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 14;
      drawHeaderBanner(false);
    }
  };

  const drawHeaderBanner = (isFirstPage: boolean) => {
    // Header Banner
    doc.setFillColor(248, 246, 242);
    doc.roundedRect(margin, y, contentWidth, isFirstPage ? 24 : 14, 3, 3, 'F');

    // Accent line
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(margin, y, 3, isFirstPage ? 24 : 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 10);
    doc.setTextColor(43, 29, 20);
    doc.text(
      isFirstPage ? 'FICHA TÉCNICA DE PRODUÇÃO' : `FICHA TÉCNICA: ${recipe.name || 'Bolo'} (continuação)`,
      margin + 7,
      y + (isFirstPage ? 9 : 6)
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 8);
    doc.setTextColor(120, 110, 100);
    doc.text(
      'Caseirinhos Fer&Dre · Precificação & Engenharia de Cardápio',
      margin + 7,
      y + (isFirstPage ? 16 : 11)
    );

    const nowStr = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(8);
    doc.setTextColor(140, 130, 120);
    doc.text(`Emissão: ${nowStr}`, pageWidth - margin - 5, y + (isFirstPage ? 9 : 6), {
      align: 'right',
    });

    y += isFirstPage ? 28 : 18;
  };

  // Initial header
  drawHeaderBanner(true);

  // Recipe Title & Category Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 25, 20);
  const titleText = recipe.name || 'Bolo Artesanal Sem Nome';
  doc.text(titleText, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 90, 85);
  const metaCategory = recipe.category ? `Categoria: ${recipe.category}  |  ` : '';
  const metaText = `${metaCategory}Rendimento Base: ${formatNumber(recipe.yield)} fatias  |  Forno: ${recipe.time || 0} min a ${recipe.temp || '180'}°C`;
  doc.text(metaText, margin, y);
  y += 7;

  // Horizontal separator
  doc.setDrawColor(230, 224, 216);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Base Costs Calculation using calculateSizeMetrics with k=1
  const baseSize: RecipeSize = {
    id: 'base_factor_1',
    nome: 'Base (Fator 1)',
    k: 1,
    pack: recipe.pack || 0,
    sell: recipe.sell || 0,
  };
  const baseMetrics = calculateSizeMetrics(recipe, baseSize, cfg, ingredients);
  const targetMargin = baseMetrics.targetMarginPercent;
  const suggestedBasePrice = baseMetrics.suggestedCakePrice;
  const costPerSlice = baseMetrics.costPerSlice;

  // 4 Quick KPI cards for Recipe Base
  checkPageBreak(22);
  const cardWidth = (contentWidth - 6) / 4;
  const kpis = [
    { label: 'CUSTO TOTAL BASE', value: formatCurrency(baseMetrics.totalCost), color: [30, 25, 20] },
    { label: 'CUSTO POR FATIA', value: formatCurrency(costPerSlice), color: [120, 80, 20] },
    { label: `PREÇO SUGERIDO (${targetMargin}%)`, value: formatCurrency(suggestedBasePrice), color: [180, 83, 9] },
    {
      label: 'PREÇO PRATICADO',
      value: recipe.sell > 0 ? formatCurrency(recipe.sell) : formatCurrency(suggestedBasePrice),
      color: [22, 101, 52],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 2);
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(230, 224, 216);
    doc.roundedRect(cardX, y, cardWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 120, 110);
    doc.text(kpi.label, cardX + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cardX + 3, y + 12);
  });

  y += 22;

  // Section: Ingredientes (Receita Base)
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(43, 29, 20);
  doc.text('1. INGREDIENTES DA RECEITA BASE (FATOR 1)', margin, y);
  y += 5;

  // Table header
  const thY = y;
  doc.setFillColor(240, 236, 230);
  doc.rect(margin, thY, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(70, 60, 50);

  const colX = {
    ing: margin + 3,
    qty: margin + 85,
    unitCost: margin + 125,
    totalCost: margin + contentWidth - 4,
  };

  doc.text('Ingrediente', colX.ing, thY + 4.5);
  doc.text('Qtd na Receita', colX.qty, thY + 4.5);
  doc.text('Custo do Insumo', colX.unitCost, thY + 4.5);
  doc.text('Custo no Bolo', colX.totalCost, thY + 4.5, { align: 'right' });
  y += 6.5;

  // Table rows
  const items = recipe.items || [];
  let totalIngCost = 0;

  items.forEach((it, idx) => {
    checkPageBreak(7);
    const ing = ingredients.find((i) => i.id === it.ing);
    const cost = getItemCost(it, ingredients);
    totalIngCost += cost;

    // Alternate row fill
    if (idx % 2 === 1) {
      doc.setFillColor(252, 251, 249);
      doc.rect(margin, y, contentWidth, 6, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 25, 20);
    const ingName = ing ? ing.name : 'Ingrediente não encontrado';
    doc.text(doc.splitTextToSize(ingName, 78)[0], colX.ing, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(`${formatNumber(it.qty)} ${it.unit}`, colX.qty, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 100, 95);
    const unitPriceStr = ing ? `${formatCurrency(ing.price)} / ${ing.size} ${ing.unit}` : 'Sem preço';
    doc.text(unitPriceStr, colX.unitCost, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 25, 20);
    doc.text(formatCurrency(cost), colX.totalCost, y + 4.2, { align: 'right' });

    y += 6;
  });

  // Table Subtotal row
  checkPageBreak(8);
  doc.setFillColor(245, 241, 235);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 40, 30);
  doc.text('SUBTOTAL DOS INGREDIENTES:', margin + 3, y + 4.5);
  doc.text(formatCurrency(totalIngCost), colX.totalCost, y + 4.5, { align: 'right' });
  y += 10;

  // Section: Custos Operacionais & Insumos Diretos
  checkPageBreak(32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(43, 29, 20);
  doc.text('2. CUSTOS OPERACIONAIS & INSUMOS DIRETOS', margin, y);
  y += 5;

  const costDetails = [
    {
      item: 'Gás de Cozinha (Forno)',
      desc: `${recipe.time || 0} min de forno a ${recipe.temp || '180'}°C (botijão ${formatCurrency(cfg.gasPrice)}/${cfg.gasKg}kg)`,
      val: formatCurrency(baseMetrics.gasCost),
    },
    {
      item: 'Energia Elétrica (Equipamentos)',
      desc:
        recipe.equip && recipe.equip.length > 0
          ? `${recipe.equip.map((e) => `${e.nome} (${e.w}W, ${e.min}min)`).join(', ')} @ ${formatCurrency(cfg.elecPrice)}/kWh`
          : 'Nenhum equipamento elétrico computado',
      val: formatCurrency(baseMetrics.elecCost),
    },
    {
      item: 'Embalagem Padrão (Base)',
      desc: 'Custo de caixa, prato ou embalagem individual da receita base',
      val: formatCurrency(recipe.pack || 0),
    },
    {
      item: 'Outros Custos Diretos',
      desc: 'Forminhas, fitas, etiquetas, guardanapos e insumos de apoio',
      val: formatCurrency(recipe.fuel || 0),
    },
  ];

  costDetails.forEach((cd, idx) => {
    checkPageBreak(6.5);
    if (idx % 2 === 1) {
      doc.setFillColor(252, 251, 249);
      doc.rect(margin, y, contentWidth, 6, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 35, 30);
    doc.text(cd.item, margin + 3, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 110, 105);
    doc.text(cd.desc, margin + 55, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 35, 30);
    doc.text(cd.val, margin + contentWidth - 4, y + 4.2, { align: 'right' });
    y += 6;
  });

  y += 6;

  // Section: Tamanhos, Fatores & Preços de Venda
  const sizes =
    recipe.sizes && recipe.sizes.length > 0
      ? recipe.sizes
      : [{ id: 'default', nome: 'Padrão (Fator 1)', k: 1, pack: recipe.pack || 0, sell: recipe.sell || 0 }];

  checkPageBreak(25 + sizes.length * 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(43, 29, 20);
  doc.text('3. ENGENHARIA DE TAMANHOS, CUSTOS & PREÇOS DE VENDA', margin, y);
  y += 5;

  // Sizes Table header
  doc.setFillColor(240, 236, 230);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 60, 50);

  const szCols = {
    nome: margin + 3,
    fator: margin + 35,
    fatias: margin + 55,
    embalagem: margin + 75,
    custoTotal: margin + 100,
    sugerido: margin + 128,
    venda: margin + 155,
    lucro: margin + contentWidth - 4,
  };

  doc.text('Tamanho', szCols.nome, y + 4.5);
  doc.text('Fator (k)', szCols.fator, y + 4.5);
  doc.text('Rend.', szCols.fatias, y + 4.5);
  doc.text('Emb. (R$)', szCols.embalagem, y + 4.5);
  doc.text('Custo Total', szCols.custoTotal, y + 4.5);
  doc.text('Sugerido', szCols.sugerido, y + 4.5);
  doc.text('Praticado', szCols.venda, y + 4.5);
  doc.text('Lucro / Margem', szCols.lucro, y + 4.5, { align: 'right' });
  y += 6.5;

  sizes.forEach((sz, idx) => {
    checkPageBreak(7);
    const metrics = calculateSizeMetrics(recipe, sz, cfg, ingredients);
    const praticado = sz.sell > 0 ? sz.sell : metrics.suggestedCakePrice;
    const lucro = praticado - metrics.totalCost;
    const margemReal = praticado > 0 ? (lucro / praticado) * 100 : 0;

    if (idx % 2 === 1) {
      doc.setFillColor(252, 251, 249);
      doc.rect(margin, y, contentWidth, 6, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 25, 20);
    doc.text(sz.nome, szCols.nome, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(`${formatNumber(sz.k, 2)}×`, szCols.fator, y + 4.2);
    doc.text(`${formatNumber(metrics.slices, 1)} fat`, szCols.fatias, y + 4.2);
    doc.text(formatCurrency(sz.pack || 0), szCols.embalagem, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(metrics.totalCost), szCols.custoTotal, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 80, 10);
    doc.text(formatCurrency(metrics.suggestedCakePrice), szCols.sugerido, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 90, 45);
    doc.text(formatCurrency(praticado), szCols.venda, y + 4.2);

    doc.setTextColor(30, 25, 20);
    doc.text(
      `${formatCurrency(lucro)} (${formatNumber(margemReal, 0)}%)`,
      szCols.lucro,
      y + 4.2,
      { align: 'right' }
    );

    y += 6;
  });

  y += 6;

  // Section: Observações & Instruções de Preparo (se houver)
  if (recipe.notes && recipe.notes.trim()) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(43, 29, 20);
    doc.text('4. OBSERVAÇÕES & MODO DE PREPARO', margin, y);
    y += 5;

    doc.setFillColor(252, 250, 247);
    doc.setDrawColor(230, 224, 216);

    const splitNotes = doc.splitTextToSize(recipe.notes.trim(), contentWidth - 8);
    const boxHeight = splitNotes.length * 4.2 + 8;
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 45, 40);
    doc.text(splitNotes, margin + 4, y + 5.5);

    y += boxHeight + 4;
  }

  // Footer for all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(230, 224, 216);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 140, 135);
    doc.text(
      `Ficha Técnica: ${recipe.name || 'Bolo'} · Caseirinhos Fer&Dre`,
      margin,
      pageHeight - 7
    );

    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: 'right',
    });
  }

  // Clean filename and trigger download
  const cleanName = (recipe.name || 'receita')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  doc.save(`ficha-tecnica-${cleanName || 'bolo'}.pdf`);
}
