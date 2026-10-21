import React, { useState } from 'react';
import {
  Settings,
  Flame,
  Zap,
  Percent,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  Smartphone,
} from 'lucide-react';
import { AppSettings, AppData } from '../types';
import { formatCurrency } from '../utils/calculations';
import { exportBackupJSON } from '../utils/storage';
import { NumericInput } from './NumericInput';
import { ProfitAccumulationChart } from './ProfitAccumulationChart';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
  cfg: AppSettings;
  data: AppData;
  onUpdateConfig: (updated: AppSettings) => void;
  onRestoreData: (imported: AppData) => void;
  onResetData: () => void;
  onSeedData: () => void;
  onOpenAuth?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  cfg,
  data,
  onUpdateConfig,
  onRestoreData,
  onResetData,
  onSeedData,
  onOpenAuth,
}) => {
  const { user, projectId, signOut } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);
  const [restoreText, setRestoreText] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState<boolean>(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateConfig({
      ...cfg,
      [key]: value,
    });
  };

  const gasKgPrice = (cfg.gasPrice || 0) / (cfg.gasKg > 0 ? cfg.gasKg : 13);
  const gasHourly = gasKgPrice * (cfg.gasRate || 0);

  const handleCopyBackup = () => {
    const str = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !Array.isArray(parsed.ings) || !Array.isArray(parsed.recs)) {
          throw new Error('Arquivo de backup inválido.');
        }
        onRestoreData(parsed);
      } catch (err: any) {
        setRestoreError('Erro ao carregar arquivo de backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextRestore = () => {
    if (!restoreText.trim()) return;
    try {
      const parsed = JSON.parse(restoreText);
      if (!parsed || !Array.isArray(parsed.ings) || !Array.isArray(parsed.recs)) {
        throw new Error('Formato do texto JSON não corresponde a um backup do app.');
      }
      onRestoreData(parsed);
      setRestoreText('');
      setRestoreError('');
    } catch (err: any) {
      setRestoreError('Texto inválido: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Top Banner */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 font-display flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-600" />
          <span>Ajustes & Parâmetros de Custo</span>
        </h2>
        <p className="text-sm text-stone-600 mt-0.5">
          Configure suas tarifas de gás, energia elétrica, margens padrão e visualize o lucro acumulado das encomendas.
        </p>
      </div>

      {/* Visualização de Lucro Acumulado com Recharts */}
      <ProfitAccumulationChart
        orders={data.orders || []}
        recipes={data.recs || []}
        ingredients={data.ings || []}
        cfg={cfg}
      />

      {/* Margem Padrão */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
            Margem de Lucro Padrão
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Margem sugerida para novas receitas (%)
          </label>
          <div className="flex items-center gap-2 max-w-xs">
            <div className="w-32">
              <NumericInput
                value={cfg.margin}
                onChange={(val) => update('margin', val)}
                placeholder="60"
                suffix="%"
                min={0}
                max={95}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
              />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">% sobre o preço de venda</span>
          </div>
        </div>

        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Como funciona a margem sobre o preço de venda:</strong>
          <br />
          Fórmula: <code className="font-mono bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">Preço = Custo ÷ (1 − Margem)</code>
          <br />
          Exemplo: se o custo total do bolo for <strong>R$ 10,00</strong> com margem de <strong>60%</strong>, o preço sugerido é <strong>R$ 25,00</strong> (você lucra R$ 15,00, que é 60% de R$ 25).
        </div>
      </div>

      {/* Gás de Cozinha */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
            Gás de Cozinha (Botijão P13 / Fogão)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Preço do botijão (R$)
            </label>
            <NumericInput
              value={cfg.gasPrice}
              onChange={(val) => update('gasPrice', val)}
              placeholder="115,00"
              prefix="R$"
              min={0}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold tabular-nums text-right text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Peso do botijão (kg)
            </label>
            <NumericInput
              value={cfg.gasKg}
              onChange={(val) => update('gasKg', val)}
              placeholder="13"
              suffix="kg"
              min={1}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold tabular-nums text-right text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Consumo do forno (kg/h)
            </label>
            <NumericInput
              value={cfg.gasRate}
              onChange={(val) => update('gasRate', val)}
              placeholder="0,30"
              suffix="kg/h"
              min={0}
              maxDecimals={2}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold tabular-nums text-right text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
            />
          </div>
        </div>

        <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 rounded-xl text-xs space-y-1">
          <div className="font-semibold text-stone-800 dark:text-stone-200">
            Custo atual do gás: <span className="text-amber-800 dark:text-amber-400">{formatCurrency(gasKgPrice)}/kg</span> · <span className="text-amber-800 dark:text-amber-400">{formatCurrency(gasHourly)}</span> por hora de uso em temperatura média
          </div>
          <p className="text-stone-500 dark:text-stone-400">
            Estimativa: boca média consome ≈ 0,20 kg/h e forno a gás consome ≈ 0,30 kg/h em temperatura média (160°C a 210°C). Em fogo baixo o app usa multiplicador ×0,8 e em fogo alto ×1,25.
          </p>
        </div>
      </div>

      {/* Energia Elétrica */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
            Energia Elétrica (Tarifa)
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
            Tarifa de energia (R$ por kWh)
          </label>
          <div className="flex items-center gap-2 max-w-xs">
            <div className="w-36">
              <NumericInput
                value={cfg.elecPrice}
                onChange={(val) => update('elecPrice', val)}
                placeholder="1,06"
                prefix="R$"
                min={0}
                maxDecimals={3}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold tabular-nums text-right text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 min-h-[42px]"
              />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">por kWh</span>
          </div>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          Referência nacional média com impostos e bandeira tarifária: ≈ R$ 1,06/kWh. Um liquidificador de 600 W ligado por 3 minutos gasta cerca de R$ 0,03 por receita.
        </p>
      </div>

      {/* Banco de Dados na Nuvem (Firebase Firestore) */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${user ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'}`}>
              {user ? <CloudCheck className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
                <span>Banco de Dados na Nuvem</span>
                {user ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    Sincronizado
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                    Local (Offline)
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {user
                  ? `Conectado como ${user.email}. Todos os seus lançamentos estão salvos no Firebase Firestore e sincronizados em tempo real.`
                  : 'Salve seus dados na nuvem para acessar do celular, notebook ou qualquer outro dispositivo sem risco de perder suas receitas e pedidos.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-auto">
            {user ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl transition-colors min-h-[40px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth && onOpenAuth()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-xs transition-all active:scale-[0.98] min-h-[40px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar ou Cadastrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Informações do Firebase e Ajuda de Autorização */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-stone-700 dark:text-stone-300">Banco na Nuvem:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">Custo de Receitas</span>
            <span className="text-[11px] text-stone-400 font-mono">(ID Cloud: {projectId || 'neural-block-ldckx'})</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://console.firebase.google.com/project/${projectId || 'neural-block-ldckx'}/settings/general`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors"
              title="Mudar o nome de exibição do projeto no Firebase"
            >
              Renomear no Firebase ✏️
            </a>
            <a
              href={`https://console.firebase.google.com/project/${projectId || 'neural-block-ldckx'}/authentication/providers`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors"
            >
              Métodos de Login ↗
            </a>
            <a
              href={`https://console.firebase.google.com/project/${projectId || 'neural-block-ldckx'}/authentication/settings`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-600 dark:hover:text-amber-400 underline transition-colors"
            >
              Domínios ↗
            </a>
          </div>
        </div>
      </div>


      {/* Backup & Restauração */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">

        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
            Backup & Segurança dos Dados
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Seus dados ficam salvos com total privacidade no armazenamento local deste navegador ({data.recs.length} receitas e {data.ings.length} ingredientes salvos).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => exportBackupJSON(data)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors min-h-[42px]"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Baixar Arquivo JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors cursor-pointer min-h-[42px]">
            <Upload className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <span>Restaurar de Arquivo JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            onClick={handleCopyBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors min-h-[42px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                <span>Copiar Texto de Backup</span>
              </>
            )}
          </button>
        </div>

        {/* Text restore area */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Restaurar colando texto de backup JSON:
          </label>
          <textarea
            rows={3}
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
            placeholder="Cole o texto JSON do seu backup aqui..."
            className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-stone-100"
          />

          {restoreError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{restoreError}</p>
          )}

          <button
            disabled={!restoreText.trim()}
            onClick={handleTextRestore}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-xl transition-colors min-h-[40px]"
          >
            Restaurar Dados do Texto
          </button>
        </div>
      </div>

      {/* Danger Zone: Seed & Reset */}
      <div className="bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-display">
          Gerenciamento Avançado
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSeedConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 rounded-xl transition-colors min-h-[42px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Exemplos Prontos</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors min-h-[42px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Apagar Todos os Dados</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>Apagar Todos os Dados?</span>
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
              Todas as receitas e ingredientes serão excluídos do navegador permanentemente. Recomendamos fazer um backup antes.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetData();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl min-h-[44px]"
              >
                Sim, Apagar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seed Confirmation Modal */}
      {showSeedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">Recarregar Exemplos?</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
              Isso irá adicionar os exemplos de receitas (Bolo de Cenoura, Bolo de Milho, etc.) e ingredientes base ao seu aplicativo.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSeedConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowSeedConfirm(false);
                  onSeedData();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl min-h-[44px]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
