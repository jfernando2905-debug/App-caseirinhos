/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppData, Recipe, Ingredient, AppSettings, Order, OrderStatus } from './types';
import { loadAppData, saveAppData, getInitialSeedData, uid, DEFAULT_CONFIG } from './utils/storage';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { OrderList } from './components/OrderList';
import { OrderFormModal } from './components/OrderFormModal';
import { RecipeList } from './components/RecipeList';
import { RecipeEditor } from './components/RecipeEditor';
import { IngredientManager } from './components/IngredientManager';
import { BatchScaler } from './components/BatchScaler';
import { SettingsView } from './components/SettingsView';
import { PasteRecipeModal } from './components/PasteRecipeModal';
import { PrintProductionSheet } from './components/PrintProductionSheet';
import { AuthModal } from './components/AuthModal';
import { Check, Info, AlertTriangle, X, Cloud, CloudCheck } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import {
  ensureUserProfile,
  seedLocalDataToCloudIfEmpty,
  subscribeToUserData,
  saveCloudIngredient,
  deleteCloudIngredient,
  saveCloudRecipe,
  deleteCloudRecipe,
  saveCloudOrder,
  deleteCloudOrder,
  saveCloudSettings,
} from './services/firestoreSync';

export default function App() {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<'orders' | 'recs' | 'ings' | 'scale' | 'cfg'>('orders');
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [orderFormOpen, setOrderFormOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState<boolean>(false);
  const [printModalRecipe, setPrintModalRecipe] = useState<Recipe | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [scalingRecipeId, setScalingRecipeId] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Theme state: light or dark mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custo-receitas-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('custo-receitas-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Auto-save local storage on data change as offline backup
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Real-time Firestore Cloud Database Synchronization
  useEffect(() => {
    if (!user) return;

    let unsub: (() => void) | undefined;

    const setupSync = async () => {
      try {
        await ensureUserProfile(user.uid, user.email || '', user.displayName);

        // Migrate local data to cloud if cloud is brand new
        const migrated = await seedLocalDataToCloudIfEmpty(user.uid, data);
        if (migrated) {
          showToast('Seus dados locais foram sincronizados e salvos no Banco de Dados na Nuvem!');
        }

        // Subscribe to real-time changes across devices
        unsub = subscribeToUserData(user.uid, {
          onIngredients: (cloudIngs) => {
            if (cloudIngs.length > 0) {
              setData((prev) => ({ ...prev, ings: cloudIngs }));
            }
          },
          onRecipes: (cloudRecs) => {
            if (cloudRecs.length > 0) {
              setData((prev) => ({ ...prev, recs: cloudRecs }));
            }
          },
          onOrders: (cloudOrders) => {
            setData((prev) => ({ ...prev, orders: cloudOrders }));
          },
          onSettings: (cloudCfg) => {
            setData((prev) => ({ ...prev, cfg: cloudCfg }));
          },
          onError: (err) => {
            console.error('Cloud synchronization error:', err);
          },
        });
      } catch (err: any) {
        console.error('Failed to initialize cloud database sync:', err);
      }
    };

    setupSync();

    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Order actions
  const handleNewOrder = () => {
    setEditingOrder(null);
    setOrderFormOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderFormOpen(true);
  };

  const handleSaveOrder = (savedOrder: Order) => {
    setData((prev) => {
      const exists = prev.orders.some((o) => o.id === savedOrder.id);
      let updatedOrders: Order[];
      if (exists) {
        updatedOrders = prev.orders.map((o) => (o.id === savedOrder.id ? savedOrder : o));
      } else {
        updatedOrders = [savedOrder, ...prev.orders];
      }
      return {
        ...prev,
        orders: updatedOrders,
      };
    });

    if (user) {
      saveCloudOrder(user.uid, savedOrder).catch((err) =>
        console.error('Error saving order to cloud:', err)
      );
    }

    showToast(
      editingOrder
        ? `Encomenda de ${savedOrder.cliente} atualizada!`
        : `Encomenda de ${savedOrder.cliente} cadastrada com sucesso!`
    );
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    let targetOrder: Order | undefined;
    setData((prev) => {
      const updated = prev.orders.map((o) => {
        if (o.id === orderId) {
          targetOrder = { ...o, status: newStatus };
          return targetOrder;
        }
        return o;
      });
      return { ...prev, orders: updated };
    });

    if (user && targetOrder) {
      saveCloudOrder(user.uid, targetOrder).catch((err) =>
        console.error('Error updating order status in cloud:', err)
      );
    }

    const statusLabel =
      newStatus === 'pronto' ? 'marcada como pronta' : newStatus === 'entregue' ? 'marcada como entregue' : 'pendente';
    showToast(`Encomenda ${statusLabel}!`);
  };

  const handleDeleteOrder = (orderId: string) => {
    setData((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== orderId),
    }));

    if (user) {
      deleteCloudOrder(user.uid, orderId).catch((err) =>
        console.error('Error deleting order from cloud:', err)
      );
    }

    showToast('Encomenda excluída com sucesso.', 'info');
  };

  const handleScaleOrder = (order: Order) => {
    const itemWithRecipe = order.itens.find((it) => it.receitaId);
    if (itemWithRecipe && itemWithRecipe.receitaId) {
      setScalingRecipeId(itemWithRecipe.receitaId);
    }
    setActiveTab('scale');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Recipe actions
  const handleNewRecipe = () => {
    const newRec: Recipe = {
      id: uid(),
      name: 'Novo Bolo',
      yield: 12,
      margin: data.cfg.margin || 60,
      time: 40,
      temp: '180',
      fuel: 0.5,
      pack: 3.5,
      sell: 0,
      items: [],
      equip: [{ nome: 'Liquidificador', w: 600, min: 3 }],
      sizes: [
        { id: uid(), nome: 'P', k: 1, pack: 2.8, sell: 0 },
        { id: uid(), nome: 'M', k: 1.6, pack: 3.5, sell: 0 },
      ],
      category: 'Bolos Caseiros',
    };

    setData((prev) => ({
      ...prev,
      recs: [newRec, ...prev.recs],
    }));

    if (user) {
      saveCloudRecipe(user.uid, newRec).catch((err) =>
        console.error('Error saving new recipe to cloud:', err)
      );
    }

    setActiveRecipe(newRec);
    setActiveTab('recs');
  };

  const handleOpenRecipe = (recipe: Recipe) => {
    setActiveRecipe(recipe);
    setActiveTab('recs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateRecipe = (updated: Recipe) => {
    setData((prev) => ({
      ...prev,
      recs: prev.recs.map((r) => (r.id === updated.id ? updated : r)),
    }));
    setActiveRecipe(updated);

    if (user) {
      saveCloudRecipe(user.uid, updated).catch((err) =>
        console.error('Error updating recipe in cloud:', err)
      );
    }
  };

  const handleDeleteRecipe = (id: string) => {
    setData((prev) => ({
      ...prev,
      recs: prev.recs.filter((r) => r.id !== id),
    }));
    setActiveRecipe(null);

    if (user) {
      deleteCloudRecipe(user.uid, id).catch((err) =>
        console.error('Error deleting recipe from cloud:', err)
      );
    }

    showToast('Receita excluída com sucesso.', 'info');
  };

  const handleDuplicateRecipe = (recipe: Recipe) => {
    const duplicated: Recipe = {
      ...recipe,
      id: uid(),
      name: `${recipe.name || 'Bolo'} (Cópia)`,
      sizes: (recipe.sizes || []).map((s) => ({ ...s, id: uid() })),
      items: (recipe.items || []).map((it) => ({ ...it })),
      equip: (recipe.equip || []).map((eq) => ({ ...eq })),
    };

    setData((prev) => ({
      ...prev,
      recs: [duplicated, ...prev.recs],
    }));

    if (user) {
      saveCloudRecipe(user.uid, duplicated).catch((err) =>
        console.error('Error saving duplicated recipe to cloud:', err)
      );
    }

    showToast(`Receita "${duplicated.name}" duplicada!`);
  };

  const handleQuickScale = (recipe: Recipe) => {
    setScalingRecipeId(recipe.id);
    setActiveRecipe(null);
    setActiveTab('scale');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ingredient actions
  const handleSaveIngredient = (ingredient: Ingredient) => {
    setData((prev) => {
      const exists = prev.ings.some((i) => i.id === ingredient.id);
      let updatedIngs: Ingredient[];
      if (exists) {
        updatedIngs = prev.ings.map((i) => (i.id === ingredient.id ? ingredient : i));
      } else {
        updatedIngs = [...prev.ings, ingredient];
      }

      return {
        ...prev,
        ings: updatedIngs,
      };
    });

    if (user) {
      saveCloudIngredient(user.uid, ingredient).catch((err) =>
        console.error('Error saving ingredient to cloud:', err)
      );
    }

    showToast(`Ingrediente "${ingredient.name}" salvo com sucesso!`);
  };

  const handleDeleteIngredient = (id: string) => {
    setData((prev) => ({
      ...prev,
      ings: prev.ings.filter((i) => i.id !== id),
      recs: prev.recs.map((r) => ({
        ...r,
        items: (r.items || []).filter((it) => it.ing !== id),
      })),
    }));

    if (user) {
      deleteCloudIngredient(user.uid, id).catch((err) =>
        console.error('Error deleting ingredient from cloud:', err)
      );
    }

    showToast('Ingrediente removido do catálogo.', 'info');
  };

  // Paste Recipe callback
  const handleRecipeCreatedFromPaste = (recipe: Recipe, newIngsCount: number) => {
    setData((prev) => ({
      ...prev,
      recs: [recipe, ...prev.recs],
    }));

    if (user) {
      saveCloudRecipe(user.uid, recipe).catch((err) =>
        console.error('Error saving imported recipe to cloud:', err)
      );
    }

    setActiveRecipe(recipe);
    setActiveTab('recs');

    if (newIngsCount > 0) {
      showToast(
        `Receita criada! ${newIngsCount} novo(s) ingrediente(s) adicionados sem preço. Preencha na aba Ingredientes.`,
        'info'
      );
    } else {
      showToast('Receita importada e criada com sucesso!');
    }
  };

  // Settings callbacks
  const handleUpdateConfig = (newCfg: AppSettings) => {
    setData((prev) => ({
      ...prev,
      cfg: newCfg,
    }));

    if (user) {
      saveCloudSettings(user.uid, newCfg).catch((err) =>
        console.error('Error saving settings to cloud:', err)
      );
    }

    showToast('Ajustes atualizados.');
  };

  const handleRestoreData = (imported: AppData) => {
    setData(imported);
    setActiveRecipe(null);
    showToast('Dados restaurados com sucesso!');
  };

  const handleResetData = () => {
    const empty: AppData = {
      ings: [],
      recs: [],
      orders: [],
      cfg: { ...DEFAULT_CONFIG },
    };
    setData(empty);
    setActiveRecipe(null);
    showToast('Todos os dados foram apagados.', 'info');
  };

  const handleSeedData = () => {
    const seed = getInitialSeedData();
    setData(seed);
    setActiveRecipe(null);
    showToast('Receitas, encomendas e ingredientes de exemplo carregados!');
  };

  const handleNavigate = (tab: 'orders' | 'recs' | 'ings' | 'scale' | 'cfg') => {
    setActiveTab(tab);
    if (tab !== 'recs') {
      setActiveRecipe(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-stone-100/60 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-200 transition-colors duration-200">
      {/* Top Header */}
      <Header
        data={data}
        onNewRecipe={handleNewRecipe}
        onNewOrder={handleNewOrder}
        onOpenPaste={() => setPasteModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-28 md:pb-12">
        {activeTab === 'orders' && (
          <OrderList
            orders={data.orders || []}
            recipes={data.recs}
            onNewOrder={handleNewOrder}
            onEditOrder={handleEditOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onScaleOrder={handleScaleOrder}
            onToast={showToast}
          />
        )}

        {activeTab === 'recs' && (
          <>
            {activeRecipe ? (
              <RecipeEditor
                recipe={activeRecipe}
                ingredients={data.ings}
                cfg={data.cfg}
                onUpdateRecipe={handleUpdateRecipe}
                onDeleteRecipe={handleDeleteRecipe}
                onBack={() => setActiveRecipe(null)}
                onOpenNewIngredientModal={() => {
                  setActiveRecipe(null);
                  setActiveTab('ings');
                }}
                onPrintRecipe={(rec) => setPrintModalRecipe(rec)}
              />
            ) : (
              <RecipeList
                data={data}
                onOpenRecipe={handleOpenRecipe}
                onNewRecipe={handleNewRecipe}
                onOpenPaste={() => setPasteModalOpen(true)}
                onDuplicateRecipe={handleDuplicateRecipe}
                onQuickScale={handleQuickScale}
                onSeedData={handleSeedData}
                onToast={showToast}
              />
            )}
          </>
        )}

        {activeTab === 'ings' && (
          <IngredientManager
            ingredients={data.ings}
            recipes={data.recs}
            onSaveIngredient={handleSaveIngredient}
            onDeleteIngredient={handleDeleteIngredient}
          />
        )}

        {activeTab === 'scale' && (
          <BatchScaler
            recipes={data.recs}
            ingredients={data.ings}
            cfg={data.cfg}
            initialRecipeId={scalingRecipeId}
            onOpenRecipe={handleOpenRecipe}
          />
        )}

        {activeTab === 'cfg' && (
          <SettingsView
            cfg={data.cfg}
            data={data}
            onUpdateConfig={handleUpdateConfig}
            onRestoreData={handleRestoreData}
            onResetData={handleResetData}
            onSeedData={handleSeedData}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onNavigate={handleNavigate}
        data={data}
      />

      {/* Modals */}
      <OrderFormModal
        order={editingOrder}
        recipes={data.recs}
        isOpen={orderFormOpen}
        onClose={() => {
          setOrderFormOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
      />

      <PasteRecipeModal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        ingredients={data.ings}
        cfg={data.cfg}
        onRecipeCreated={handleRecipeCreatedFromPaste}
      />

      {printModalRecipe && (
        <PrintProductionSheet
          recipe={printModalRecipe}
          ingredients={data.ings}
          cfg={data.cfg}
          onClose={() => setPrintModalRecipe(null)}
        />
      )}

      {/* Cloud Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccessToast={(msg) => showToast(msg)}
      />

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-3 bg-stone-900 text-stone-100 rounded-xl shadow-xl text-xs font-medium border border-stone-800 toast-container animate-fade-in max-w-sm">
          {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-stone-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
