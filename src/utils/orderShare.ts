import { jsPDF } from 'jspdf';
import { Order, OrderItem } from '../types';
import { formatCurrency } from './calculations';

export const CAKE_TYPES = [
  'Bolo caseiro',
  'Bolo de aniversário',
  'Bolo de casamento',
  'Bolo no pote',
  'Naked cake',
  'Cupcakes',
  'Outro',
];

export const CAKE_SIZES = [
  'Único',
  'Mini',
  'Pequeno',
  'Médio',
  'Grande',
  'Extra grande',
];

export const CAKE_FLAVORS = [
  'Fubá',
  'Fubá com goiabada',
  'Milho',
  'Milho com requeijão',
  'Cenoura',
  'Cenoura com Chocolate',
  'Chocolate',
  'Cuca de banana',
  'Ninho com Nutella',
  'Red Velvet',
  'Limão',
  'Laranja',
];

export const formatItemText = (item: OrderItem): string => {
  const qtyPrefix = item.qtd > 1 ? `${item.qtd}× ` : '';
  const sizePart = item.tamanho ? ` • ${item.tamanho}` : '';
  const flavorPart = item.sabor ? ` • ${item.sabor}` : '';
  return `${qtyPrefix}${item.tipo}${sizePart}${flavorPart}`;
};

export const formatDatePtBR = (dateStr?: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const formatOrderWhatsApp = (order: Order): string => {
  let text = `*Encomenda de bolo*\n`;
  text += `Cliente: ${order.cliente}\n`;
  if (order.telefone) {
    text += `Telefone: ${order.telefone}\n`;
  }

  const items = order.itens && order.itens.length > 0 ? order.itens : [];
  if (items.length > 1) {
    text += `Bolos:\n`;
    items.forEach((it, idx) => {
      text += `${idx + 1}) ${formatItemText(it)}\n`;
    });
  } else if (items.length === 1) {
    text += `Bolo: ${formatItemText(items[0])}\n`;
  }

  const dateFormatted = formatDatePtBR(order.entrega);
  text += `Entrega: ${dateFormatted}${order.hora ? ` às ${order.hora}` : ''}\n`;

  if (order.valor !== undefined && order.valor !== null && order.valor > 0) {
    const valorStr = formatCurrency(order.valor);
    const sinalStr = order.sinal && order.sinal > 0 ? formatCurrency(order.sinal) : '';
    const restante = order.sinal ? Math.max(order.valor - order.sinal, 0) : order.valor;
    const restanteStr = formatCurrency(restante);

    if (order.sinal && order.sinal > 0) {
      text += `Valor: ${valorStr} (sinal ${sinalStr} pago • restante ${restanteStr})\n`;
    } else {
      text += `Valor: ${valorStr}\n`;
    }

    if (order.pago) {
      text += `Pagamento: QUITADO / PAGO ✅\n`;
    } else {
      text += `Pagamento: A RECEBER (Restante: ${restanteStr}) ⏳\n`;
    }
  }

  text += `Status: ${order.status.toUpperCase()}\n`;
  if (order.obs && order.obs.trim()) {
    text += `Obs: ${order.obs.trim()}\n`;
  }

  return text;
};

export const formatPaymentReminderWhatsApp = (order: Order): string => {
  const restante = order.valor ? Math.max(order.valor - (order.sinal || 0), 0) : 0;
  const restanteStr = formatCurrency(restante);
  const dataFormatada = formatDatePtBR(order.entrega);

  let text = `Olá, ${order.cliente}! Tudo bem? 😊\n\n`;
  text += `Passando para enviar o lembrete da sua encomenda da *Caseirinhos Fer&Dre*:\n`;
  text += `📅 Data de entrega: ${dataFormatada}${order.hora ? ` às ${order.hora}` : ''}\n`;
  text += `🎂 Pedido: ${order.itens.map((it) => formatItemText(it)).join(', ')}\n\n`;
  text += `💰 *Valor restante a acertar:* ${restanteStr}\n\n`;
  text += `Qualquer dúvida estamos à disposição! Muito obrigado(a)! 🍰❤️`;
  return text;
};

export const sendOrderWhatsApp = async (
  order: Order,
  onCopySuccess: () => void,
  onError: (msg: string) => void
): Promise<void> => {
  const text = formatOrderWhatsApp(order);
  let cleanPhone = (order.telefone || '').replace(/\D/g, '');

  let url = 'https://wa.me/?text=' + encodeURIComponent(text);
  if (cleanPhone) {
    if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    url = `https://wa.me/${cleanPhone}?text=` + encodeURIComponent(text);
  }

  try {
    const opened = window.open(url, '_blank');
    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      // Popup blocked, copy text to clipboard
      await navigator.clipboard.writeText(text);
      onCopySuccess();
    }
  } catch (err) {
    try {
      await navigator.clipboard.writeText(text);
      onCopySuccess();
    } catch (clipErr) {
      onError('Não foi possível abrir o WhatsApp nem copiar o texto.');
    }
  }
};

export const generateOrderPdf = (order: Order): void => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a5',
    orientation: 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  let y = 16;

  // Header
  doc.setFillColor(245, 240, 235);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(43, 29, 20); // warm dark brown
  doc.text('ENCOMENDA DE BOLO', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 100, 90);
  doc.text('Caseirinhos Fer&Dre · Confeitaria Caseira', margin + 6, y + 15);

  const statusLabel = order.status.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  if (order.status === 'entregue') {
    doc.setTextColor(46, 125, 50); // green
  } else if (order.status === 'pronto') {
    doc.setTextColor(2, 132, 199); // blue
  } else {
    doc.setTextColor(217, 119, 6); // amber/warning
  }
  doc.text(statusLabel, pageWidth - margin - 6, y + 12, { align: 'right' });

  y += 26;

  // Helper row drawer
  const drawField = (label: string, value: string, boldValue = false) => {
    if (!value) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(70, 60, 55);
    doc.text(label, margin, y);

    doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
    doc.setTextColor(30, 25, 20);
    const splitVal = doc.splitTextToSize(value, contentWidth - 36);
    doc.text(splitVal, margin + 36, y);

    y += Math.max(6, splitVal.length * 5) + 2;
  };

  drawField('Cliente:', order.cliente, true);
  if (order.telefone) {
    drawField('Telefone:', order.telefone);
  }

  const deliveryStr = `${formatDatePtBR(order.entrega)}${order.hora ? ` às ${order.hora}` : ''}`;
  drawField('Entrega:', deliveryStr, true);

  // Line separator
  doc.setDrawColor(230, 220, 210);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  // Cakes list
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(43, 29, 20);
  doc.text('Bolos da Encomenda:', margin, y);
  y += 6;

  const items = order.itens && order.itens.length > 0 ? order.itens : [];
  items.forEach((it, idx) => {
    const prefix = items.length > 1 ? `${idx + 1}) ` : '• ';
    const textItem = `${prefix}${formatItemText(it)}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 25, 20);
    const lines = doc.splitTextToSize(textItem, contentWidth - 8);
    doc.text(lines, margin + 4, y);
    y += lines.length * 5 + 1;
  });

  y += 2;
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Financials
  if (order.valor !== undefined && order.valor !== null && order.valor > 0) {
    drawField('Valor Total:', formatCurrency(order.valor), true);

    if (order.sinal !== undefined && order.sinal !== null && order.sinal > 0) {
      drawField('Sinal Pago:', formatCurrency(order.sinal));
      const restante = Math.max(order.valor - order.sinal, 0);
      drawField('Restante:', formatCurrency(restante), true);
    }
  }

  // Observations
  if (order.obs && order.obs.trim()) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(70, 60, 55);
    doc.text('Observações:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 40, 35);
    const obsLines = doc.splitTextToSize(order.obs.trim(), contentWidth);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 4.5 + 4;
  }

  // Footer date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 140, 135);
  doc.text(
    `Impresso em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  // Clean filename
  const cleanCliente = (order.cliente || 'bolo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `encomenda-${cleanCliente}-${order.entrega || 'data'}.pdf`;

  doc.save(filename);
};

/**
 * Generates and downloads a complete A4 PDF report of all or filtered orders.
 */
export const generateOrdersReportPdf = (orders: Order[], filterLabel = 'Todas'): void => {
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
      drawReportHeader(false);
    }
  };

  const drawReportHeader = (isFirst: boolean) => {
    doc.setFillColor(248, 246, 242);
    doc.roundedRect(margin, y, contentWidth, isFirst ? 22 : 14, 3, 3, 'F');
    doc.setFillColor(217, 119, 6);
    doc.rect(margin, y, 3, isFirst ? 22 : 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirst ? 14 : 10);
    doc.setTextColor(43, 29, 20);
    doc.text(
      isFirst ? 'RELATÓRIO DE ENCOMENDAS DE BOLOS' : `RELATÓRIO DE ENCOMENDAS (${filterLabel}) - continuação`,
      margin + 7,
      y + (isFirst ? 8.5 : 6)
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirst ? 8.5 : 8);
    doc.setTextColor(120, 110, 100);
    doc.text(
      `Filtro selecionado: ${filterLabel}  |  Total: ${orders.length} pedido(s)`,
      margin + 7,
      y + (isFirst ? 15.5 : 11)
    );

    doc.setFontSize(8);
    doc.setTextColor(140, 130, 120);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 5, y + (isFirst ? 8.5 : 6), {
      align: 'right',
    });

    y += isFirst ? 26 : 18;
  };

  drawReportHeader(true);

  // Financial summary of listed orders
  let totalValor = 0;
  let totalSinal = 0;
  let totalRestante = 0;

  orders.forEach((o) => {
    const val = o.valor || 0;
    const sin = o.sinal || 0;
    totalValor += val;
    totalSinal += sin;
    totalRestante += Math.max(val - sin, 0);
  });

  const summaryCards = [
    { label: 'QTD ENCOMENDAS', value: `${orders.length} pedidos`, color: [30, 25, 20] },
    { label: 'VALOR TOTAL BRUTO', value: formatCurrency(totalValor), color: [180, 83, 9] },
    { label: 'SINAIS PAGOS', value: formatCurrency(totalSinal), color: [22, 101, 52] },
    { label: 'RESTANTE A RECEBER', value: formatCurrency(totalRestante), color: [194, 65, 12] },
  ];

  const cardW = (contentWidth - 6) / 4;
  summaryCards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 2);
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(230, 224, 216);
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 120, 110);
    doc.text(c.label, cx + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, cx + 3, y + 12);
  });

  y += 22;

  // Table header
  doc.setFillColor(240, 236, 230);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 50, 40);

  const cols = {
    entrega: margin + 3,
    cliente: margin + 30,
    bolos: margin + 85,
    status: margin + 140,
    valor: margin + contentWidth - 4,
  };

  doc.text('Entrega', cols.entrega, y + 4.8);
  doc.text('Cliente / Contato', cols.cliente, y + 4.8);
  doc.text('Bolos & Sabores', cols.bolos, y + 4.8);
  doc.text('Status', cols.status, y + 4.8);
  doc.text('Valor Total', cols.valor, y + 4.8, { align: 'right' });
  y += 7;

  // Orders rows
  if (orders.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 110, 100);
    doc.text('Nenhuma encomenda encontrada para o filtro selecionado.', margin + 4, y + 8);
    y += 14;
  } else {
    orders.forEach((o, idx) => {
      checkPageBreak(12);

      if (idx % 2 === 1) {
        doc.setFillColor(252, 251, 249);
        doc.rect(margin, y, contentWidth, 10, 'F');
      }

      // Date / Time
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 25, 20);
      const dataStr = formatDatePtBR(o.entrega) || '-';
      doc.text(dataStr, cols.entrega, y + 4.2);
      if (o.hora) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(110, 100, 95);
        doc.text(`às ${o.hora}`, cols.entrega, y + 8);
      }

      // Cliente
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 25, 20);
      const clienteShort = doc.splitTextToSize(o.cliente || 'Sem nome', 52)[0];
      doc.text(clienteShort, cols.cliente, y + 4.2);
      if (o.telefone) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(110, 100, 95);
        doc.text(o.telefone, cols.cliente, y + 8);
      }

      // Bolos text
      const items = o.itens || [];
      const itemSummaries = items.map((it) => `${it.qtd > 1 ? `${it.qtd}× ` : ''}${it.tipo} ${it.sabor}`);
      const cakeSummary = itemSummaries.join(', ') || 'Sem bolos';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 35, 30);
      const cakeLines = doc.splitTextToSize(cakeSummary, 52);
      doc.text(cakeLines[0] || '', cols.bolos, y + 4.2);
      if (cakeLines[1]) {
        doc.text(cakeLines[1], cols.bolos, y + 8);
      }

      // Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (o.status === 'entregue') {
        doc.setTextColor(22, 101, 52); // green
      } else if (o.status === 'pronto') {
        doc.setTextColor(2, 132, 199); // blue
      } else {
        doc.setTextColor(180, 83, 9); // amber
      }
      doc.text(o.status.toUpperCase(), cols.status, y + 5);

      // Valor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 25, 20);
      const valStr = o.valor ? formatCurrency(o.valor) : '-';
      doc.text(valStr, cols.valor, y + 4.2, { align: 'right' });

      if (o.sinal && o.sinal > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(110, 100, 95);
        const rest = Math.max((o.valor || 0) - o.sinal, 0);
        doc.text(`rest. ${formatCurrency(rest)}`, cols.valor, y + 8, { align: 'right' });
      }

      y += 10.5;
    });
  }

  // Footer on all pages
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
      `Relatório de Encomendas (${filterLabel}) · Caseirinhos Fer&Dre`,
      margin,
      pageHeight - 7
    );

    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: 'right',
    });
  }

  const cleanFilter = filterLabel.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`relatorio-encomendas-${cleanFilter}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

