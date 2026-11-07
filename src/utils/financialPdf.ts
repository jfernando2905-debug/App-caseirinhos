import { jsPDF } from 'jspdf';
import { Order, Recipe, Ingredient, AppSettings } from '../types';
import { getMonthlyProfitHistory, MonthlyProfitData, calculateOrderCostAndProfit } from './orderMetrics';
import { formatCurrency, formatNumber, calculateSizeMetrics } from './calculations';
import { formatDatePtBR, getLocalDateStr } from './dateUtils';

export interface GenerateFinancialReportPdfOptions {
  orders: Order[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  cfg: AppSettings;
  storeName?: string;
}

/**
 * Generates an executive A4 Financial Report PDF containing:
 * 1. Financial KPIs (Faturamento, Custos, Lucro Líquido, Margem, A Receber, Em Caixa)
 * 2. Fixed & Variable Cost Breakdown (Ingredientes, Embalagens, Energia/Gás, Mão de Obra)
 * 3. Profit by Period (Monthly Financial Statement DRE)
 * 4. Pending Accounts Receivable & Orders Status Summary
 */
export function generateFinancialReportPdf({
  orders,
  recipes,
  ingredients,
  cfg,
  storeName = 'Caseirinhos Fer&Dre',
}: GenerateFinancialReportPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // 1. Calculate General Financial Figures
  let faturamentoTotal = 0;
  let faturamentoEntregue = 0;
  let totalCustoEstimado = 0;
  let lucroLiquidoEstimado = 0;
  let totalAReceber = 0;
  let aReceberEntregues = 0;
  let totalRecebidoCaixa = 0;
  let unpaidCount = 0;

  const counts = { pendente: 0, pronto: 0, entregue: 0 };
  const values = { pendente: 0, pronto: 0, entregue: 0 };

  for (const order of orders) {
    const val = order.valor || 0;
    const sin = order.sinal || 0;
    const restante = Math.max(0, val - sin);

    faturamentoTotal += val;

    const st = order.status || 'pendente';
    counts[st] = (counts[st] || 0) + 1;
    values[st] = (values[st] || 0) + val;

    if (st === 'entregue') {
      faturamentoEntregue += val;
    }

    if (order.pago) {
      totalRecebidoCaixa += val;
    } else {
      totalRecebidoCaixa += sin;
      if (restante > 0) {
        totalAReceber += restante;
        unpaidCount++;
        if (st === 'entregue') {
          aReceberEntregues += restante;
        }
      }
    }

    const { cost, profit } = calculateOrderCostAndProfit(order, recipes, ingredients, cfg);
    totalCustoEstimado += cost;
    lucroLiquidoEstimado += profit;
  }

  const margemMediaGeral =
    faturamentoTotal > 0 ? (lucroLiquidoEstimado / faturamentoTotal) * 100 : cfg.margin || 60;
  const ticketMedio = orders.length > 0 ? faturamentoTotal / orders.length : 0;

  // 2. Calculate Variable vs. Fixed Cost Distribution
  let ingrTotal = 0;
  let packTotal = 0;
  let equipTotal = 0;
  let laborTotal = 0;

  for (const order of orders) {
    const items = order.itens || [];
    const orderRevenue = order.valor || 0;

    for (const item of items) {
      const qty = Math.max(1, item.qtd || 1);
      let rec = item.receitaId ? recipes.find((r) => r.id === item.receitaId) : undefined;
      if (!rec) {
        rec = recipes.find(
          (r) =>
            r.name.toLowerCase().trim() === (item.sabor || '').toLowerCase().trim() ||
            r.id === item.sabor
        );
      }

      if (rec) {
        const matchedSize =
          (rec.sizes || []).find(
            (s) => s.nome.toLowerCase() === (item.tamanho || '').toLowerCase()
          ) ||
          (rec.sizes || [])[0] || {
            id: 'default',
            nome: 'Padrão',
            k: 1,
            pack: rec.pack || 0,
            sell: rec.sell || 0,
          };

        const metrics = calculateSizeMetrics(rec, matchedSize, cfg, ingredients);
        ingrTotal += metrics.ingrCost * qty;
        packTotal += metrics.packCost * qty;
        equipTotal += (metrics.gasCost + metrics.elecCost) * qty;

        const laborPerCake =
          metrics.fuelCost > 0
            ? metrics.fuelCost
            : ((rec.time || 30) / 60) * 12 * (matchedSize.k || 1);
        laborTotal += laborPerCake * qty;
      } else {
        const itemVal =
          item.valorUnitario && item.valorUnitario > 0
            ? item.valorUnitario * qty
            : items.length > 0
            ? orderRevenue / items.length
            : 0;
        const estimatedCost = itemVal * (1 - (cfg.margin || 60) / 100);

        ingrTotal += estimatedCost * 0.65;
        packTotal += estimatedCost * 0.15;
        equipTotal += estimatedCost * 0.1;
        laborTotal += estimatedCost * 0.1;
      }
    }
  }

  const totalCustosCalculados = ingrTotal + packTotal + equipTotal + laborTotal;
  const safeTotalCustos = totalCustosCalculados > 0 ? totalCustosCalculados : 1;

  // Custos Variáveis: Ingredientes + Embalagens
  const custosVariaveis = ingrTotal + packTotal;
  const percVariavel = Math.round((custosVariaveis / safeTotalCustos) * 1000) / 10;

  // Custos Fixos & Operacionais: Equipamentos (Gás/Energia) + Mão de Obra
  const custosFixosOperacionais = equipTotal + laborTotal;
  const percFixo = Math.round((custosFixosOperacionais / safeTotalCustos) * 1000) / 10;

  // 3. Monthly Financial History
  const monthlyData: MonthlyProfitData[] = getMonthlyProfitHistory(orders, recipes, ingredients, cfg);

  // Helper for page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = margin;
      drawHeader(false);
    }
  };

  // Draw Header
  const drawHeader = (isFirst: boolean) => {
    // Banner Box
    doc.setFillColor(248, 246, 242);
    doc.roundedRect(margin, y, contentWidth, isFirst ? 24 : 14, 3, 3, 'F');

    // Accent line
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(margin, y, 3.5, isFirst ? 24 : 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirst ? 14 : 10);
    doc.setTextColor(43, 29, 20);
    doc.text(
      isFirst
        ? 'RELATÓRIO FINANCEIRO & DEMONSTRATIVO DRE'
        : 'RELATÓRIO FINANCEIRO - Continuação',
      margin + 7,
      y + (isFirst ? 9 : 6)
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirst ? 8.5 : 8);
    doc.setTextColor(120, 110, 100);
    doc.text(
      `${storeName} · Lucro por Período, Custos Fixos & Variáveis`,
      margin + 7,
      y + (isFirst ? 16 : 11)
    );

    const now = new Date();
    doc.setFontSize(8);
    doc.setTextColor(140, 130, 120);
    doc.text(
      `Emissão: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      pageWidth - margin - 5,
      y + (isFirst ? 9 : 6),
      { align: 'right' }
    );

    y += isFirst ? 28 : 18;
  };

  drawHeader(true);

  // Section 1: 5 Main Executive KPI Cards
  const kpiCards = [
    { label: 'FATURAMENTO TOTAL', value: formatCurrency(faturamentoTotal), sub: `${orders.length} pedido(s)`, color: [180, 83, 9] },
    { label: 'CUSTO ESTIMADO', value: formatCurrency(totalCustoEstimado), sub: `${formatNumber(100 - margemMediaGeral, 1)}% do total`, color: [190, 24, 93] },
    { label: 'LUCRO ESTIMADO', value: formatCurrency(lucroLiquidoEstimado), sub: `${formatNumber(margemMediaGeral, 1)}% margem média`, color: [22, 101, 52] },
    { label: 'RECEBIDO EM CAIXA', value: formatCurrency(totalRecebidoCaixa), sub: 'Quitado / Sinais', color: [15, 118, 110] },
    { label: 'TOTAL A RECEBER', value: formatCurrency(totalAReceber), sub: `${unpaidCount} pendente(s)`, color: [194, 65, 12] },
  ];

  const cardW = (contentWidth - 8) / 5;
  kpiCards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 2);
    doc.setFillColor(252, 251, 249);
    doc.setDrawColor(230, 224, 216);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 120, 110);
    doc.text(c.label, cx + 2.5, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, cx + 2.5, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 130, 120);
    doc.text(c.sub, cx + 2.5, y + 15);
  });

  y += 23;

  // Section 2: Detalhamento de Custos Fixos e Variáveis
  checkPageBreak(50);

  doc.setFillColor(243, 239, 233);
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 45, 30);
  doc.text('1. ESTRUTURA DE CUSTOS DE PRODUÇÃO (VARIÁVEIS vs. FIXOS / OPERACIONAIS)', margin + 3, y + 4.8);
  y += 9;

  // Two columns: Left (Custos Variáveis) / Right (Custos Fixos e Parâmetros)
  const colW = (contentWidth - 4) / 2;

  // Box Left: Custos Variáveis
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 224, 216);
  doc.roundedRect(margin, y, colW, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.text('CUSTOS VARIÁVEIS (Diretos por Bolo)', margin + 3.5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 70, 60);

  // Ingredientes
  doc.text('• Ingredientes (Consumo de insumos):', margin + 3.5, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(ingrTotal)} (${formatNumber((ingrTotal / safeTotalCustos) * 100, 1)}%)`, margin + colW - 3.5, y + 12, { align: 'right' });

  // Embalagens
  doc.setFont('helvetica', 'normal');
  doc.text('• Embalagens (Caixas, laços, pratos):', margin + 3.5, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(packTotal)} (${formatNumber((packTotal / safeTotalCustos) * 100, 1)}%)`, margin + colW - 3.5, y + 18, { align: 'right' });

  // Subtotal Variável
  doc.setDrawColor(230, 224, 216);
  doc.line(margin + 3.5, y + 23, margin + colW - 3.5, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 30, 20);
  doc.text('Subtotal Custos Variáveis:', margin + 3.5, y + 29);
  doc.setTextColor(180, 83, 9);
  doc.text(`${formatCurrency(custosVariaveis)} (${percVariavel}%)`, margin + colW - 3.5, y + 29, { align: 'right' });

  // Box Right: Custos Fixos & Operacionais
  const rightX = margin + colW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 224, 216);
  doc.roundedRect(rightX, y, colW, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199);
  doc.text('CUSTOS FIXOS & OPERACIONAIS (Estrutura)', rightX + 3.5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 70, 60);

  // Equipamentos (Gás / Luz)
  doc.text('• Forno & Equipamentos (Gás e Energia):', rightX + 3.5, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(equipTotal)} (${formatNumber((equipTotal / safeTotalCustos) * 100, 1)}%)`, rightX + colW - 3.5, y + 12, { align: 'right' });

  // Mão de Obra
  doc.setFont('helvetica', 'normal');
  doc.text('• Mão de Obra / Custo Operacional:', rightX + 3.5, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(laborTotal)} (${formatNumber((laborTotal / safeTotalCustos) * 100, 1)}%)`, rightX + colW - 3.5, y + 18, { align: 'right' });

  // Subtotal Fixo / Operacional
  doc.setDrawColor(230, 224, 216);
  doc.line(rightX + 3.5, y + 23, rightX + colW - 3.5, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 30, 20);
  doc.text('Subtotal Custos Fixos/Oper.:', rightX + 3.5, y + 29);
  doc.setTextColor(2, 132, 199);
  doc.text(`${formatCurrency(custosFixosOperacionais)} (${percFixo}%)`, rightX + colW - 3.5, y + 29, { align: 'right' });

  y += 40;

  // Information footer parameters strip
  doc.setFillColor(248, 246, 242);
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 100, 90);
  doc.text(
    `Parâmetros Configurados: Botijão Gás: R$ ${formatNumber(cfg.gasPrice, 2)} (${cfg.gasKg}kg)  |  Tarifa Energia: R$ ${formatNumber(cfg.elecPrice, 2)}/kWh  |  Margem Alvo Padrão: ${cfg.margin}%`,
    margin + 3,
    y + 4.8
  );

  y += 12;

  // Section 3: Demonstrativo de Lucro por Período (DRE Mensal)
  checkPageBreak(50);

  doc.setFillColor(243, 239, 233);
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 45, 30);
  doc.text('2. HISTÓRICO MENSAL DE RESULTADOS (LUCRO POR PERÍODO)', margin + 3, y + 4.8);
  y += 9;

  // Monthly Table Header
  const mCols = {
    mes: margin + 3,
    pedidos: margin + 32,
    faturamento: margin + 65,
    custos: margin + 102,
    lucro: margin + 140,
    margem: margin + contentWidth - 4,
  };

  doc.setFillColor(235, 230, 222);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 50, 40);

  doc.text('Mês / Período', mCols.mes, y + 4.5);
  doc.text('Pedidos', mCols.pedidos, y + 4.5);
  doc.text('Faturamento (R$)', mCols.faturamento, y + 4.5, { align: 'right' });
  doc.text('Custos Estimados (R$)', mCols.custos, y + 4.5, { align: 'right' });
  doc.text('Lucro Líquido (R$)', mCols.lucro, y + 4.5, { align: 'right' });
  doc.text('Margem Realizada', mCols.margem, y + 4.5, { align: 'right' });
  y += 6.5;

  if (monthlyData.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 110, 100);
    doc.text('Nenhum dado financeiro registrado para os períodos.', margin + 3, y + 5);
    y += 10;
  } else {
    monthlyData.forEach((m, idx) => {
      checkPageBreak(9);

      if (idx % 2 === 1) {
        doc.setFillColor(252, 251, 249);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }

      const margemMes = m.faturamento > 0 ? (m.lucroMes / m.faturamento) * 100 : 0;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 30, 20);
      doc.text(m.monthLabel, mCols.mes, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 70, 60);
      doc.text(`${m.ordersCount} ${m.ordersCount === 1 ? 'pedido' : 'pedidos'}`, mCols.pedidos, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(formatCurrency(m.faturamento), mCols.faturamento, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(190, 24, 93);
      doc.text(formatCurrency(m.custo), mCols.custos, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text(`+${formatCurrency(m.lucroMes)}`, mCols.lucro, y + 4.2, { align: 'right' });

      doc.setTextColor(15, 118, 110);
      doc.text(`${formatNumber(margemMes, 1)}%`, mCols.margem, y + 4.2, { align: 'right' });

      y += 6.2;
    });

    // Totals row
    checkPageBreak(9);
    doc.setFillColor(245, 241, 235);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 25, 20);
    doc.text('TOTAL ACUMULADO:', mCols.mes, y + 4.8);

    const totalOrdersCount = monthlyData.reduce((acc, m) => acc + m.ordersCount, 0);
    const totalFat = monthlyData.reduce((acc, m) => acc + m.faturamento, 0);
    const totalCst = monthlyData.reduce((acc, m) => acc + m.custo, 0);
    const totalLuc = monthlyData.reduce((acc, m) => acc + m.lucroMes, 0);
    const margemTotalGeral = totalFat > 0 ? (totalLuc / totalFat) * 100 : 0;

    doc.text(`${totalOrdersCount} pedidos`, mCols.pedidos, y + 4.8);
    doc.setTextColor(180, 83, 9);
    doc.text(formatCurrency(totalFat), mCols.faturamento, y + 4.8, { align: 'right' });
    doc.setTextColor(190, 24, 93);
    doc.text(formatCurrency(totalCst), mCols.custos, y + 4.8, { align: 'right' });
    doc.setTextColor(22, 101, 52);
    doc.text(`+${formatCurrency(totalLuc)}`, mCols.lucro, y + 4.8, { align: 'right' });
    doc.setTextColor(15, 118, 110);
    doc.text(`${formatNumber(margemTotalGeral, 1)}%`, mCols.margem, y + 4.8, { align: 'right' });

    y += 11;
  }

  // Section 4: Contas a Receber e Status das Encomendas
  checkPageBreak(50);

  doc.setFillColor(243, 239, 233);
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 45, 30);
  doc.text('3. CONTAS A RECEBER & SITUAÇÃO DAS ENCOMENDAS', margin + 3, y + 4.8);
  y += 9;

  // Unpaid Orders List
  const unpaidOrdersList = orders.filter((o) => {
    const val = o.valor || 0;
    const sin = o.sinal || 0;
    const rest = Math.max(0, val - sin);
    return !o.pago && val > 0 && rest > 0;
  });

  const uCols = {
    cliente: margin + 3,
    entrega: margin + 55,
    status: margin + 95,
    valorTotal: margin + 125,
    sinal: margin + 150,
    restante: margin + contentWidth - 4,
  };

  doc.setFillColor(235, 230, 222);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 50, 40);

  doc.text('Cliente', uCols.cliente, y + 4.5);
  doc.text('Data Entrega', uCols.entrega, y + 4.5);
  doc.text('Status Pedido', uCols.status, y + 4.5);
  doc.text('Total (R$)', uCols.valorTotal, y + 4.5, { align: 'right' });
  doc.text('Sinal (R$)', uCols.sinal, y + 4.5, { align: 'right' });
  doc.text('A Receber (R$)', uCols.restante, y + 4.5, { align: 'right' });
  y += 6.5;

  if (unpaidOrdersList.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text('✅ Nenhuma conta a receber pendente. Todos os pagamentos foram quitados!', margin + 3, y + 5);
    y += 10;
  } else {
    unpaidOrdersList.forEach((o, idx) => {
      checkPageBreak(8);

      if (idx % 2 === 1) {
        doc.setFillColor(252, 251, 249);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }

      const val = o.valor || 0;
      const sin = o.sinal || 0;
      const rest = Math.max(0, val - sin);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(40, 30, 20);
      doc.text(o.cliente, uCols.cliente, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 80, 70);
      doc.text(formatDatePtBR(o.entrega) + (o.hora ? ` às ${o.hora}` : ''), uCols.entrega, y + 4.2);

      doc.setFont('helvetica', 'bold');
      const stColor =
        o.status === 'entregue'
          ? [16, 185, 129]
          : o.status === 'pronto'
          ? [2, 132, 199]
          : [245, 158, 11];
      doc.setTextColor(stColor[0], stColor[1], stColor[2]);
      doc.text((o.status || 'pendente').toUpperCase(), uCols.status, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 50, 40);
      doc.text(formatCurrency(val), uCols.valorTotal, y + 4.2, { align: 'right' });

      doc.setTextColor(15, 118, 110);
      doc.text(formatCurrency(sin), uCols.sinal, y + 4.2, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 65, 12);
      doc.text(formatCurrency(rest), uCols.restante, y + 4.2, { align: 'right' });

      y += 6.2;
    });

    // Unpaid Total row
    checkPageBreak(8);
    doc.setFillColor(254, 243, 199); // amber-100
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.text('TOTAL A RECEBER PENDENTE:', uCols.cliente, y + 4.5);
    doc.text(formatCurrency(totalAReceber), uCols.restante, y + 4.5, { align: 'right' });
    y += 10;
  }

  // Draw Page Number Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 215, 205);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 130, 120);
    doc.text(
      `${storeName} · Relatório Financeiro Executivo e DRE`,
      margin,
      pageHeight - 7.5
    );

    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7.5,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Convenience helper to generate and download the financial report PDF.
 */
export function downloadFinancialReportPdf(options: GenerateFinancialReportPdfOptions): void {
  const doc = generateFinancialReportPdf(options);
  const dateStr = getLocalDateStr();
  doc.save(`relatorio-financeiro-caseirinhos-${dateStr}.pdf`);
}
