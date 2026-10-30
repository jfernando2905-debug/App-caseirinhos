import React, { useRef, useState } from 'react';
import {
  X,
  FileDown,
  Image as ImageIcon,
  Printer,
  MessageCircle,
  ChefHat,
  Copy,
  Check,
} from 'lucide-react';
import { Order } from '../types';
import {
  formatItemText,
  formatDatePtBR,
  sendOrderWhatsApp,
  generateOrderPdf,
  downloadOrderJpeg,
  PIX_CONFIG,
} from '../utils/orderShare';
import { formatCurrency } from '../utils/calculations';

interface OrderPreviewModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({
  order,
  isOpen,
  onClose,
  onToast,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloadingJpeg, setDownloadingJpeg] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_CONFIG.chave);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
      if (onToast) {
        onToast(`Chave Pix copiada: ${PIX_CONFIG.chaveFormatada} (CPF)`);
      }
    } catch {
      if (onToast) {
        onToast('Não foi possível copiar a chave Pix.', 'error');
      }
    }
  };

  if (!isOpen || !order) return null;

  const items = order.itens && order.itens.length > 0 ? order.itens : [];
  const totalValue = order.valor || 0;
  const signalValue = order.sinal || 0;
  const remainingValue = Math.max(totalValue - signalValue, 0);

  // Download vector PDF
  const handleDownloadPdf = () => {
    setDownloadingPdf(true);
    try {
      generateOrderPdf(order);
      if (onToast) onToast('PDF do pedido baixado com sucesso!');
    } catch (err: any) {
      if (onToast) onToast('Erro ao gerar PDF: ' + err.message, 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download high-definition JPEG matching PDF layout exactly via Canvas
  const handleDownloadJpeg = async () => {
    setDownloadingJpeg(true);
    try {
      await downloadOrderJpeg(order);
      if (onToast) onToast('Comprovante em JPEG baixado com sucesso!');
    } catch (err: any) {
      console.error('Failed to generate JPEG:', err);
      if (onToast) onToast('Erro ao gerar imagem JPEG: ' + err.message, 'error');
    } finally {
      setDownloadingJpeg(false);
    }
  };

  // WhatsApp share
  const handleWhatsApp = async () => {
    await sendOrderWhatsApp(
      order,
      () => {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2500);
        if (onToast) onToast('Resumo copiado para a área de transferência! Cole no WhatsApp.');
      },
      (errMsg) => {
        if (onToast) onToast(errMsg, 'error');
      }
    );
  };

  // Browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Visualização do Pedido
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Confira os dados antes de baixar em PDF ou JPEG
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-stone-100 dark:bg-stone-950 flex justify-center">
          {/* Printable / Renderable Receipt Card (Layout identical to PDF) */}
          <div
            ref={receiptRef}
            className="w-full max-w-lg bg-white text-[#1e1914] p-6 sm:p-8 rounded-2xl shadow-lg border border-[#e6dcd2] space-y-4 print:shadow-none print:border-none print:p-0 print:m-0"
            style={{ backgroundColor: '#ffffff', minHeight: '520px' }}
          >
            {/* Header Box (Matching PDF: warm beige rounded banner) */}
            <div
              className="rounded-xl p-4 sm:p-5 flex items-center justify-between gap-3 border border-[#e8dfd5]"
              style={{ backgroundColor: '#f5f0eb' }}
            >
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#2b1d14] font-display">
                  ENCOMENDA DE BOLO
                </h3>
                <p className="text-xs text-[#78645a] font-medium">
                  Caseirinhos Fer&Dre · Confeitaria Caseira
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider"
                  style={{
                    color:
                      order.status === 'entregue'
                        ? '#2e7d32'
                        : order.status === 'pronto'
                        ? '#0284c7'
                        : '#d97706',
                  }}
                >
                  {order.status.toUpperCase()}
                </span>
                <p className="text-[10px] text-[#a09088] font-mono mt-0.5">
                  ID: #{order.id.slice(0, 8)}
                </p>
              </div>
            </div>

            {/* Customer & Delivery Block (Matching PDF format) */}
            <div className="space-y-1.5 text-sm text-[#463c37] pt-1">
              <div className="flex items-baseline gap-3">
                <span className="w-20 shrink-0 font-bold text-[#463c37]">Cliente:</span>
                <strong className="font-bold text-[#1e1914]">{order.cliente}</strong>
              </div>

              {order.telefone && (
                <div className="flex items-baseline gap-3">
                  <span className="w-20 shrink-0 font-bold text-[#463c37]">Telefone:</span>
                  <span className="text-[#1e1914]">{order.telefone}</span>
                </div>
              )}

              <div className="flex items-baseline gap-3">
                <span className="w-20 shrink-0 font-bold text-[#463c37]">Entrega:</span>
                <strong className="font-bold text-[#1e1914]">
                  {formatDatePtBR(order.entrega)}
                  {order.hora ? ` às ${order.hora}` : ''}
                </strong>
              </div>
            </div>

            {/* Separator line (Matching PDF #e6dcd2) */}
            <div className="border-t border-[#e6dcd2]" />

            {/* Bolos da Encomenda (Matching PDF) */}
            <div className="space-y-2.5">
              <h4 className="text-sm font-bold text-[#2b1d14]">
                Bolos da Encomenda:
              </h4>

              <div className="space-y-2 text-sm text-[#1e1914]">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-[#78645a] shrink-0">
                        {items.length > 1 ? `${idx + 1})` : '•'}
                      </span>
                      <div>
                        <span className="font-semibold">{formatItemText(it)}</span>
                      </div>
                    </div>

                    {it.valorUnitario && it.valorUnitario > 0 ? (
                      <span className="font-bold text-[#55443c] tabular-nums shrink-0 text-xs sm:text-sm">
                        {formatCurrency(it.valorUnitario * it.qtd)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Separator line */}
            <div className="border-t border-[#e6dcd2]" />

            {/* Financials (Matching PDF) */}
            {totalValue > 0 && (
              <div className="space-y-1.5 text-sm text-[#463c37]">
                <div className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 font-bold text-[#463c37]">Valor Total:</span>
                  <strong className="text-base font-bold text-[#1e1914] tabular-nums">
                    {formatCurrency(totalValue)}
                  </strong>
                </div>

                {signalValue > 0 && (
                  <div className="flex items-baseline gap-3">
                    <span className="w-28 shrink-0 font-bold text-[#463c37]">Sinal Pago:</span>
                    <span className="text-[#1e1914] tabular-nums font-medium">
                      {formatCurrency(signalValue)}
                    </span>
                  </div>
                )}

                {signalValue > 0 && (
                  <div className="flex items-baseline gap-3">
                    <span className="w-28 shrink-0 font-bold text-[#463c37]">Restante:</span>
                    <strong
                      className={`tabular-nums ${
                        remainingValue === 0 ? 'text-[#2e7d32]' : 'text-[#854d0e]'
                      }`}
                    >
                      {remainingValue === 0 ? 'Quitado ✓' : formatCurrency(remainingValue)}
                    </strong>
                  </div>
                )}

                <div className="flex items-baseline gap-3 pt-0.5">
                  <span className="w-28 shrink-0 font-bold text-[#463c37]">Pagamento:</span>
                  <span
                    className={`font-bold text-xs sm:text-sm ${
                      order.pago ? 'text-[#2e7d32]' : 'text-[#b45309]'
                    }`}
                  >
                    {order.pago
                      ? 'QUITADO / PAGO ✅'
                      : `A RECEBER (${formatCurrency(remainingValue)}) ⏳`}
                  </span>
                </div>
              </div>
            )}

            {/* Pix Payment Box (Matching PDF: soft emerald box with green stroke) */}
            <div
              className="rounded-xl p-3.5 sm:p-4 border-2 border-[#22c55e] space-y-1.5"
              style={{ backgroundColor: '#f8faf8' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#15803d]">
                  PAGAMENTO VIA PIX
                </span>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-[#15803d] hover:text-[#0f5c2b] bg-white hover:bg-emerald-50 border border-[#22c55e] rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer no-print"
                  title="Copiar chave Pix (CPF)"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3 h-3 text-[#15803d]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#15803d]" />
                      <span>Copiar Chave</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-1 text-xs sm:text-sm">
                <span className="font-mono font-bold text-[#191919] tracking-wide">
                  CPF: {PIX_CONFIG.chaveFormatada} ({PIX_CONFIG.chave})
                </span>
                <span className="text-xs text-[#6e6e6e]">
                  Favorecido: {PIX_CONFIG.beneficiario}
                </span>
              </div>
            </div>

            {/* Observations (Matching PDF) */}
            {order.obs && order.obs.trim() && (
              <div className="space-y-1 text-xs sm:text-sm pt-1">
                <strong className="block font-bold text-[#463c37]">Observações:</strong>
                <p className="text-[#322823] whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                  {order.obs}
                </p>
              </div>
            )}

            {/* Footer Date (Matching PDF) */}
            <div className="pt-3 border-t border-[#e6dcd2] flex items-center justify-between text-[11px] text-[#968c87]">
              <span>
                Impresso em {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>Caseirinhos Fer&Dre</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="p-4 sm:px-6 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Download JPEG Button */}
            <button
              onClick={handleDownloadJpeg}
              disabled={downloadingJpeg}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 min-h-[40px]"
              title="Baixar imagem JPEG para salvar na galeria ou enviar no WhatsApp"
            >
              <ImageIcon className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>{downloadingJpeg ? 'Gerando Imagem...' : 'Baixar como JPEG'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 min-h-[40px]"
              title="Baixar comprovante formatado em documento PDF"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>{downloadingPdf ? 'Gerando PDF...' : 'Baixar em PDF'}</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors min-h-[40px]"
              title="Enviar resumo por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{copiedText ? 'Copiado!' : 'WhatsApp'}</span>
            </button>

            {/* Quick Copy Pix Button */}
            <button
              onClick={handleCopyPix}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors min-h-[40px]"
              title="Copiar chave Pix (CPF: 06631306973)"
            >
              {copiedPix ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">Pix Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500 shrink-0" />
                  <span>Copiar Pix</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition-colors min-h-[40px]"
              title="Imprimir comprovante"
            >
              <Printer className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Imprimir</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors min-h-[40px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
