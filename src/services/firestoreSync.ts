import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppData, Ingredient, Recipe, Order, AppSettings } from '../types';

/**
 * Strips all undefined fields recursively to prevent Firestore 'Unsupported field value: undefined' errors.
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = removeUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Ensures user profile document exists in Firestore.
 */
export async function ensureUserProfile(userId: string, email: string, displayName?: string | null) {
  const path = `users/${userId}`;
  try {
    await setDoc(
      doc(db, 'users', userId),
      removeUndefined({
        userId,
        email: email || '',
        displayName: displayName || '',
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Checks if user collections in Firestore are empty and seeds them from localData if available.
 */
export async function seedLocalDataToCloudIfEmpty(userId: string, localData: AppData): Promise<boolean> {
  let seededAny = false;

  try {
    // 1. Migrate Ingredients if cloud is empty
    if (localData.ings && localData.ings.length > 0) {
      const existingIngs = await getDocs(collection(db, 'users', userId, 'ingredients'));
      if (existingIngs.empty) {
        for (const ing of localData.ings) {
          const payload = removeUndefined({
            ...ing,
            userId,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'users', userId, 'ingredients', ing.id), payload);
        }
        seededAny = true;
      }
    }

    // 2. Migrate Recipes if cloud is empty
    if (localData.recs && localData.recs.length > 0) {
      const existingRecs = await getDocs(collection(db, 'users', userId, 'recipes'));
      if (existingRecs.empty) {
        for (const rec of localData.recs) {
          const payload = removeUndefined({
            ...rec,
            userId,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'users', userId, 'recipes', rec.id), payload);
        }
        seededAny = true;
      }
    }

    // 3. Migrate Orders if cloud is empty
    if (localData.orders && localData.orders.length > 0) {
      const existingOrders = await getDocs(collection(db, 'users', userId, 'orders'));
      if (existingOrders.empty) {
        for (const ord of localData.orders) {
          const payload = removeUndefined({
            ...ord,
            userId,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(doc(db, 'users', userId, 'orders', ord.id), payload);
        }
        seededAny = true;
      }
    }

    // 4. Migrate Settings if cloud config does not exist
    if (localData.cfg) {
      const configDoc = await getDoc(doc(db, 'users', userId, 'settings', 'config'));
      if (!configDoc.exists()) {
        const payload = removeUndefined({
          ...localData.cfg,
          id: 'config',
          userId,
          updatedAt: new Date().toISOString(),
        });
        await setDoc(doc(db, 'users', userId, 'settings', 'config'), payload);
        seededAny = true;
      }
    }

    return seededAny;
  } catch (err) {
    console.warn('Initial cloud migration check warning:', err);
    return false;
  }
}

/**
 * Sets up realtime snapshot listeners for user collections with resilient error handling.
 */
export function subscribeToUserData(
  userId: string,
  callbacks: {
    onIngredients: (ings: Ingredient[]) => void;
    onRecipes: (recs: Recipe[]) => void;
    onOrders: (orders: Order[]) => void;
    onSettings: (cfg: AppSettings) => void;
    onError?: (err: any) => void;
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
          hist: Array.isArray(data.hist) ? data.hist : [],
        });
      });
      callbacks.onIngredients(items);
    },
    (error) => {
      console.warn(`Firestore sync error on ${ingsPath}:`, error);
      if (callbacks.onError) callbacks.onError(error);
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
          items: Array.isArray(data.items) ? data.items : [],
          equip: Array.isArray(data.equip) ? data.equip : [],
          sizes: Array.isArray(data.sizes) ? data.sizes : [],
          category: data.category || 'Bolos Caseiros',
          notes: data.notes || data.instructions || '',
        });
      });
      callbacks.onRecipes(items);
    },
    (error) => {
      console.warn(`Firestore sync error on ${recsPath}:`, error);
      if (callbacks.onError) callbacks.onError(error);
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
          valor: typeof data.valor === 'number' ? data.valor : 0,
          sinal: typeof data.sinal === 'number' ? data.sinal : 0,
          pago: typeof data.pago === 'boolean' ? data.pago : undefined,
          pagoEm: typeof data.pagoEm === 'number' ? data.pagoEm : undefined,
          status: data.status || 'pendente',
          obs: data.obs || '',
          itens: Array.isArray(data.itens) ? data.itens : [],
          criadoEm: typeof data.criadoEm === 'number' ? data.criadoEm : Date.now(),
        });
      });
      items.sort((a, b) => (b.entrega || '').localeCompare(a.entrega || ''));
      callbacks.onOrders(items);
    },
    (error) => {
      console.warn(`Firestore sync error on ${ordersPath}:`, error);
      if (callbacks.onError) callbacks.onError(error);
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
          gasRate: Number(data.gasRate) || 0.3,
          elecPrice: Number(data.elecPrice) || 1.06,
          ingOpen: data.ingOpen ?? true,
        });
      }
    },
    (error) => {
      console.warn(`Firestore sync error on ${settingsPath}:`, error);
      if (callbacks.onError) callbacks.onError(error);
    }
  );
  unsubscribers.push(unsubSettings);

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Single item mutations with undefined sanitation

export async function saveCloudIngredient(userId: string, ing: Ingredient): Promise<void> {
  const path = `users/${userId}/ingredients/${ing.id}`;
  try {
    const payload = removeUndefined({
      ...ing,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'ingredients', ing.id), payload);
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
    const payload = removeUndefined({
      ...rec,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'recipes', rec.id), payload);
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
    const payload = removeUndefined({
      ...ord,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'orders', ord.id), payload);
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
    const payload = removeUndefined({
      ...cfg,
      id: 'config',
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'settings', 'config'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
