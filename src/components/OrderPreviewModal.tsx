import React, { useRef, useState } from 'react';
import {
  X,
  FileDown,
  Image as ImageIcon,
  Printer,
  MessageCircle,
  Calendar,
  Clock,
  Phone,
  User,
  DollarSign,
  ChefHat,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Order, OrderStatus } from '../types';
import {
  formatItemText,
  formatDatePtBR,
  sendOrderWhatsApp,
  generateOrderPdf,
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

  if (!isOpen || !order) return null;

  const items = order.itens && order.itens.length > 0 ? order.itens : [];
  const totalValue = order.valor || 0;
  const signalValue = order.sinal || 0;
  const remainingValue = Math.max(totalValue - signalValue, 0);

  // Status visual attributes
  const statusConfig: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    pendente: {
      label: 'Pendente',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
    },
    pronto: {
      label: 'Pronto para Entrega',
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      border: 'border-sky-300',
    },
    entregue: {
      label: 'Entregue / Concluído',
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
    },
  };

  const currentStatus = statusConfig[order.status] || statusConfig.pendente;

  // Clean filename generator
  const getFileBaseName = () => {
    const cleanCliente = (order.cliente || 'pedido')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `comprovante-${cleanCliente}-${order.entrega || 'data'}`;
  };

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

  // Download high-res JPEG using html2canvas
  const handleDownloadJpeg = async () => {
    if (!receiptRef.current) return;
    setDownloadingJpeg(true);

    try {
      // High-resolution rendering (scale: 2 for sharp text on retina & mobile)
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 700,
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `${getFileBaseName()}.jpeg`;
      link.href = dataUrl;
      link.click();

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
          {/* Printable / Renderable Receipt Card */}
          <div
            ref={receiptRef}
            className="w-full max-w-lg bg-white text-stone-900 p-6 sm:p-8 rounded-2xl shadow-md border border-stone-200 space-y-6 print:shadow-none print:border-none print:p-0 print:m-0"
            style={{ minHeight: '520px', backgroundColor: '#ffffff' }}
          >
            {/* Header of Receipt */}
            <div className="border-b-2 border-stone-100 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍰</span>
                    <h3 className="text-lg font-black tracking-tight text-stone-900 font-display">
                      Custo de Receitas
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    Confeitaria Artesanal & Encomendas de Bolos
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Comprovante de Pedido • Emissão: {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="shrink-0 text-right space-y-1">
                  <span
                    className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
                  >
                    {currentStatus.label}
                  </span>
                  <p className="text-[10px] text-stone-400 font-mono">
                    ID: #{order.id.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer & Delivery Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Cliente
                </span>
                <p className="font-bold text-sm text-stone-900">{order.cliente}</p>
                {order.telefone && (
                  <p className="text-stone-600 flex items-center gap-1 font-medium">
                    <Phone className="w-3 h-3 text-stone-400" />
                    <span>{order.telefone}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Data de Entrega
                </span>
                <p className="font-bold text-sm text-amber-700 flex items-center gap-1 sm:justify-end">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDatePtBR(order.entrega)}</span>
                </p>
                {order.hora && (
                  <p className="text-stone-600 flex items-center gap-1 sm:justify-end font-medium">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Horário: às {order.hora}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Cake Items Table */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Itens da Encomenda ({items.length})
                </span>
              </div>

              <div className="divide-y divide-stone-100 text-xs mt-1">
                {items.map((it, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-amber-600 shrink-0 w-4 text-center">
                        {it.qtd}×
                      </span>
                      <div>
                        <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                          {it.tipo}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {it.tamanho && <span>Tamanho: <strong>{it.tamanho}</strong></span>}
                          {it.tamanho && it.sabor && <span> • </span>}
                          {it.sabor && <span>Sabor: <strong>{it.sabor}</strong></span>}
                        </p>
                      </div>
                    </div>

                    {it.valorUnitario && it.valorUnitario > 0 ? (
                      <span className="font-medium text-stone-700 tabular-nums shrink-0">
                        {formatCurrency(it.valorUnitario * it.qtd)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            {totalValue > 0 && (
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-700">
                  <span className="font-medium">Valor Total da Encomenda:</span>
                  <span className="text-base font-bold text-stone-900 tabular-nums">
                    {formatCurrency(totalValue)}
                  </span>
                </div>

                {signalValue > 0 && (
                  <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-amber-200/60">
                    <span>Sinal Pago adiantado:</span>
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      - {formatCurrency(signalValue)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-amber-200 font-bold text-stone-900 text-sm">
                  <span>Saldo Restante na Entrega:</span>
                  <span
                    className={`tabular-nums ${
                      remainingValue === 0
                        ? 'text-emerald-700 font-bold'
                        : 'text-amber-900 font-black text-base'
                    }`}
                  >
                    {remainingValue === 0 ? 'Quitado ✓' : formatCurrency(remainingValue)}
                  </span>
                </div>
              </div>
            )}

            {/* Observations */}
            {order.obs && order.obs.trim() && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <span className="font-bold text-stone-700 uppercase text-[10px] tracking-wider">
                  Observações & Detalhes
                </span>
                <p className="text-stone-600 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {order.obs}
                </p>
              </div>
            )}

            {/* Footer Message */}
            <div className="pt-4 border-t border-dashed border-stone-200 text-center space-y-1 text-stone-400 text-[10px]">
              <p className="font-medium text-stone-500">
                Agradecemos pela preferência! Feito com amor e ingredientes de qualidade.
              </p>
              <p>
                Este comprovante pode ser apresentado no momento da entrega do bolo.
              </p>
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
