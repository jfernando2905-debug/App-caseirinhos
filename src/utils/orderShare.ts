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

export const PIX_CONFIG = {
  tipo: 'CPF',
  chave: '06631306973',
  chaveFormatada: '066.313.069-73',
  beneficiario: 'Andressa Martins de Oliveira',
  banco: 'NuBank',
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

  text += `\n🔑 *Chave Pix para pagamento:*\nTipo: CPF\nChave: ${PIX_CONFIG.chave} (${PIX_CONFIG.chaveFormatada})\nBeneficiária: ${PIX_CONFIG.beneficiario}\nBanco: ${PIX_CONFIG.banco}\n`;

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
  text += `🔑 *Chave Pix para pagamento:*\n`;
  text += `Tipo: CPF\n`;
  text += `Chave: ${PIX_CONFIG.chave} (${PIX_CONFIG.chaveFormatada})\n`;
  text += `Beneficiária: ${PIX_CONFIG.beneficiario}\n`;
  text += `Banco: ${PIX_CONFIG.banco}\n\n`;
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

  // Pix Payment Box
  y += 2;
  doc.setFillColor(248, 252, 248);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, 20, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('PAGAMENTO VIA PIX', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(25, 25, 25);
  doc.text(`CPF: ${PIX_CONFIG.chaveFormatada}  (${PIX_CONFIG.chave})`, margin + 4, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 80, 75);
  doc.text(`Beneficiária: ${PIX_CONFIG.beneficiario}  ·  Banco: ${PIX_CONFIG.banco}`, margin + 4, y + 16.5);

  y += 25;

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
 * Helper to wrap text for HTML5 Canvas 2D
 */
const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

/**
 * Draws a rounded rectangle path on Canvas 2D
 */
const drawCanvasRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth = 1
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
};

/**
 * Renders an Order into an HTML5 Canvas matching the PDF layout pixel-perfectly.
 * Output is high-resolution (800px width), ideal for saving or sharing via WhatsApp.
 */
export const renderOrderToCanvas = (order: Order, targetWidth = 800): HTMLCanvasElement => {
  const width = targetWidth;
  // A5 width is 148mm, margin is 14mm -> ~9.45%
  const margin = Math.round(width * (14 / 148));
  const contentWidth = width - 2 * margin;

  // Measurement pass to dynamically calculate needed height
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;

  let calcY = margin;
  calcY += 80 + 26; // Header box + gap
  calcY += 30; // Cliente
  if (order.telefone) calcY += 26; // Telefone
  calcY += 28; // Entrega
  calcY += 26; // Separator + margin

  // Bolos section
  calcY += 30; // Bolos title
  const items = order.itens && order.itens.length > 0 ? order.itens : [];
  mCtx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  items.forEach((it, idx) => {
    const prefix = items.length > 1 ? `${idx + 1}) ` : '• ';
    const textItem = `${prefix}${formatItemText(it)}`;
    const lines = wrapCanvasText(mCtx, textItem, contentWidth - 110);
    calcY += Math.max(26, lines.length * 22 + 6);
  });
  calcY += 26; // Separator + margin

  // Financials
  if (order.valor !== undefined && order.valor !== null && order.valor > 0) {
    calcY += 28;
    if (order.sinal && order.sinal > 0) {
      calcY += 54;
    }
    calcY += 28; // Payment status
    calcY += 10;
  }

  // Pix Box
  calcY += 84 + 24;

  // Observations
  if (order.obs && order.obs.trim()) {
    calcY += 26;
    mCtx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    const obsLines = wrapCanvasText(mCtx, order.obs.trim(), contentWidth);
    calcY += obsLines.length * 20 + 20;
  }

  calcY += 60; // Footer gap
  calcY += margin;

  // Minimum height matching A5 aspect ratio (1:1.4189)
  const minA5Height = Math.round(width * 1.4189);
  const totalHeight = Math.max(calcY, minA5Height);

  // Render pass
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // White clean background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  // Subtle outer border
  ctx.strokeStyle = '#e6dcd2';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, width - 2, totalHeight - 2);

  let y = margin;

  // 1. Header Box (Warm beige rounded banner, exactly like PDF)
  drawCanvasRoundRect(ctx, margin, y, contentWidth, 80, 10, '#f5f0eb');

  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#2b1d14'; // warm dark brown
  ctx.textBaseline = 'top';
  ctx.fillText('ENCOMENDA DE BOLO', margin + 18, y + 18);

  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#78645a';
  ctx.fillText('Caseirinhos Fer&Dre · Confeitaria Caseira', margin + 18, y + 48);

  // Status badge on right
  const statusLabel = order.status.toUpperCase();
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  if (order.status === 'entregue') {
    ctx.fillStyle = '#2e7d32'; // green
  } else if (order.status === 'pronto') {
    ctx.fillStyle = '#0284c7'; // blue
  } else {
    ctx.fillStyle = '#d97706'; // amber
  }
  const statusWidth = ctx.measureText(statusLabel).width;
  ctx.fillText(statusLabel, margin + contentWidth - statusWidth - 18, y + 30);

  y += 80 + 26;

  // 2. Helper row drawer for key-value fields
  const drawField = (label: string, value: string, boldValue = false, valueColor = '#1e1914') => {
    if (!value) return;
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#463c37';
    ctx.textBaseline = 'top';
    ctx.fillText(label, margin, y);

    ctx.font = `${boldValue ? 'bold ' : ''}15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = valueColor;
    const splitVal = wrapCanvasText(ctx, value, contentWidth - 120);
    splitVal.forEach((line, i) => {
      ctx.fillText(line, margin + 120, y + i * 22);
    });

    y += Math.max(26, splitVal.length * 22 + 4);
  };

  drawField('Cliente:', order.cliente, true);
  if (order.telefone) {
    drawField('Telefone:', order.telefone);
  }
  const deliveryStr = `${formatDatePtBR(order.entrega)}${order.hora ? ` às ${order.hora}` : ''}`;
  drawField('Entrega:', deliveryStr, true);

  // 3. Separator Line
  y += 6;
  ctx.strokeStyle = '#e6dcd2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(margin + contentWidth, y);
  ctx.stroke();
  y += 18;

  // 4. Bolos da Encomenda
  ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#2b1d14';
  ctx.fillText('Bolos da Encomenda:', margin, y);
  y += 26;

  items.forEach((it, idx) => {
    const prefix = items.length > 1 ? `${idx + 1}) ` : '• ';
    const textItem = `${prefix}${formatItemText(it)}`;

    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#1e1914';
    const lines = wrapCanvasText(ctx, textItem, contentWidth - 120);
    lines.forEach((line, i) => {
      ctx.fillText(line, margin + 10, y + i * 22);
    });

    if (it.valorUnitario && it.valorUnitario > 0) {
      const priceStr = formatCurrency(it.valorUnitario * it.qtd);
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = '#55443c';
      const priceW = ctx.measureText(priceStr).width;
      ctx.fillText(priceStr, margin + contentWidth - priceW, y);
    }

    y += Math.max(26, lines.length * 22 + 6);
  });

  // 5. Separator Line
  y += 8;
  ctx.strokeStyle = '#e6dcd2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(margin + contentWidth, y);
  ctx.stroke();
  y += 18;

  // 6. Financials
  if (order.valor !== undefined && order.valor !== null && order.valor > 0) {
    drawField('Valor Total:', formatCurrency(order.valor), true);

    if (order.sinal !== undefined && order.sinal !== null && order.sinal > 0) {
      drawField('Sinal Pago:', formatCurrency(order.sinal));
      const restante = Math.max(order.valor - order.sinal, 0);
      drawField('Restante:', formatCurrency(restante), true, restante > 0 ? '#854d0e' : '#15803d');
    }

    if (order.pago) {
      drawField('Pagamento:', 'QUITADO / PAGO ✅', true, '#15803d');
    } else {
      const rest = order.sinal ? Math.max(order.valor - order.sinal, 0) : order.valor;
      drawField('Pagamento:', `A RECEBER (${formatCurrency(rest)}) ⏳`, true, '#b45309');
    }
  }

  // 7. Pix Payment Box (matching PDF exactly)
  y += 8;
  const pixBoxHeight = 84;
  drawCanvasRoundRect(ctx, margin, y, contentWidth, pixBoxHeight, 8, '#f8faf8', '#22c55e', 1.5);

  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#15803d'; // emerald-700
  ctx.fillText('PAGAMENTO VIA PIX', margin + 16, y + 14);

  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#191919';
  ctx.fillText(`CPF: ${PIX_CONFIG.chaveFormatada}  (${PIX_CONFIG.chave})`, margin + 16, y + 36);

  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#55443c';
  ctx.fillText(`Beneficiária: ${PIX_CONFIG.beneficiario}  ·  Banco: ${PIX_CONFIG.banco}`, margin + 16, y + 60);

  y += pixBoxHeight + 22;

  // 8. Observations
  if (order.obs && order.obs.trim()) {
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#463c37';
    ctx.fillText('Observações:', margin, y);
    y += 24;

    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#322823';
    const obsLines = wrapCanvasText(ctx, order.obs.trim(), contentWidth);
    obsLines.forEach((line, i) => {
      ctx.fillText(line, margin, y + i * 20);
    });
    y += obsLines.length * 20 + 20;
  }

  // 9. Footer date (at bottom)
  const footerY = totalHeight - 26;
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#968c87';
  const footerDate = `Impresso em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  ctx.fillText(footerDate, margin, footerY);

  return canvas;
};

/**
 * Generates a high-quality JPEG Blob for an order with layout identical to PDF.
 */
export const generateOrderJpegBlob = (order: Order): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = renderOrderToCanvas(order, 800);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao gerar imagem JPEG a partir do canvas.'));
          }
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Downloads high-definition JPEG of the order receipt matching the PDF layout.
 */
export const downloadOrderJpeg = async (order: Order): Promise<void> => {
  const blob = await generateOrderJpegBlob(order);
  const cleanCliente = (order.cliente || 'bolo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `comprovante-${cleanCliente}-${order.entrega || 'data'}.jpeg`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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

