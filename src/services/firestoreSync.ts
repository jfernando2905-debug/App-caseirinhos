import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppData, Ingredient, Recipe, Order, AppSettings } from '../types';

/**
 * Ensures user profile document exists in Firestore.
 */
export async function ensureUserProfile(userId: string, email: string, displayName?: string | null) {
  const path = `users/${userId}`;
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        userId,
        email: email || '',
        displayName: displayName || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Checks if the user has any data stored in Firestore.
 * If empty and localData has content, uploads localData to cloud seamlessly.
 */
export async function seedLocalDataToCloudIfEmpty(userId: string, localData: AppData): Promise<boolean> {
  const ingsPath = `users/${userId}/ingredients`;
  const recsPath = `users/${userId}/recipes`;
  const ordersPath = `users/${userId}/orders`;

  try {
    const existingIngs = await getDocs(collection(db, 'users', userId, 'ingredients'));
    const existingRecs = await getDocs(collection(db, 'users', userId, 'recipes'));
    const existingOrders = await getDocs(collection(db, 'users', userId, 'orders'));

    const isEmpty = existingIngs.empty && existingRecs.empty && existingOrders.empty;

    if (isEmpty && (localData.recs.length > 0 || localData.ings.length > 0 || localData.orders.length > 0)) {
      // Migrate ingredients
      for (const ing of localData.ings) {
        await setDoc(doc(db, 'users', userId, 'ingredients', ing.id), {
          ...ing,
          userId,
          updatedAt: new Date().toISOString(),
        });
      }

      // Migrate recipes
      for (const rec of localData.recs) {
        await setDoc(doc(db, 'users', userId, 'recipes', rec.id), {
          ...rec,
          userId,
          updatedAt: new Date().toISOString(),
        });
      }

      // Migrate orders
      for (const ord of localData.orders) {
        await setDoc(doc(db, 'users', userId, 'orders', ord.id), {
          ...ord,
          userId,
          updatedAt: new Date().toISOString(),
        });
      }

      // Migrate settings
      if (localData.cfg) {
        await setDoc(doc(db, 'users', userId, 'settings', 'config'), {
          ...localData.cfg,
          id: 'config',
          userId,
          updatedAt: new Date().toISOString(),
        });
      }

      return true;
    }
    return false;
  } catch (err) {
    console.warn('Initial cloud migration check warning:', err);
    return false;
  }
}

/**
 * Sets up realtime snapshot listeners for user collections.
 */
export function subscribeToUserData(
  userId: string,
  callbacks: {
    onIngredients: (ings: Ingredient[]) => void;
    onRecipes: (recs: Recipe[]) => void;
    onOrders: (orders: Order[]) => void;
    onSettings: (cfg: AppSettings) => void;
    onError: (err: any) => void;
  }
) {
  const unsubscribers: (() => void)[] = [];

  // 1. Ingredients Listener
  const ingsPath = `users/${userId}/ingredients`;
  const unsubIngs = onSnapshot(
    collection(db, 'users', userId, 'ingredients'),
    (snapshot) => {
      const items: Ingredient[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          name: data.name || '',
          price: Number(data.price) || 0,
          size: Number(data.size) || 1,
          unit: data.unit || 'g',
          category: data.category,
          hist: data.hist || [],
        });
      });
      callbacks.onIngredients(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ingsPath);
    }
  );
  unsubscribers.push(unsubIngs);

  // 2. Recipes Listener
  const recsPath = `users/${userId}/recipes`;
  const unsubRecs = onSnapshot(
    collection(db, 'users', userId, 'recipes'),
    (snapshot) => {
      const items: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          name: data.name || '',
          yield: Number(data.yield) || 12,
          margin: Number(data.margin) || 60,
          time: Number(data.time) || 40,
          temp: data.temp || '180',
          fuel: Number(data.fuel) || 0.5,
          pack: Number(data.pack) || 3.5,
          sell: Number(data.sell) || 0,
          items: data.items || [],
          equip: data.equip || [],
          sizes: data.sizes || [],
          category: data.category || 'Bolos Caseiros',
          notes: data.notes || '',
        });
      });
      callbacks.onRecipes(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, recsPath);
    }
  );
  unsubscribers.push(unsubRecs);

  // 3. Orders Listener
  const ordersPath = `users/${userId}/orders`;
  const unsubOrders = onSnapshot(
    collection(db, 'users', userId, 'orders'),
    (snapshot) => {
      const items: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          cliente: data.cliente || '',
          telefone: data.telefone || '',
          entrega: data.entrega || '',
          hora: data.hora || '',
          valor: Number(data.valor) || 0,
          sinal: Number(data.sinal) || 0,
          status: data.status || 'pendente',
          obs: data.obs || '',
          itens: data.itens || [],
          criadoEm: typeof data.criadoEm === 'number' ? data.criadoEm : Date.now(),
        });
      });
      // Sort orders descending by delivery date
      items.sort((a, b) => b.entrega.localeCompare(a.entrega));
      callbacks.onOrders(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ordersPath);
    }
  );
  unsubscribers.push(unsubOrders);

  // 4. Settings Listener
  const settingsPath = `users/${userId}/settings/config`;
  const unsubSettings = onSnapshot(
    doc(db, 'users', userId, 'settings', 'config'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callbacks.onSettings({
          margin: Number(data.margin) || 60,
          gasPrice: Number(data.gasPrice) || 115,
          gasKg: Number(data.gasKg) || 13,
          gasRate: Number(data.gasRate) || 0.225,
          elecPrice: Number(data.elecPrice) || 0.95,
          ingOpen: data.ingOpen ?? true,
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, settingsPath);
    }
  );
  unsubscribers.push(unsubSettings);

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Single item mutations

export async function saveCloudIngredient(userId: string, ing: Ingredient): Promise<void> {
  const path = `users/${userId}/ingredients/${ing.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'ingredients', ing.id), {
      ...ing,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudIngredient(userId: string, id: string): Promise<void> {
  const path = `users/${userId}/ingredients/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'ingredients', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCloudRecipe(userId: string, rec: Recipe): Promise<void> {
  const path = `users/${userId}/recipes/${rec.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'recipes', rec.id), {
      ...rec,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudRecipe(userId: string, id: string): Promise<void> {
  const path = `users/${userId}/recipes/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'recipes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCloudOrder(userId: string, ord: Order): Promise<void> {
  const path = `users/${userId}/orders/${ord.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'orders', ord.id), {
      ...ord,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudOrder(userId: string, id: string): Promise<void> {
  const path = `users/${userId}/orders/${id}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'orders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCloudSettings(userId: string, cfg: AppSettings): Promise<void> {
  const path = `users/${userId}/settings/config`;
  try {
    await setDoc(doc(db, 'users', userId, 'settings', 'config'), {
      ...cfg,
      id: 'config',
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
