# Security Specification for Custo de Receitas Firestore Rules

## 1. Data Invariants

1. **User Ownership & Isolation**:
   - Every collection (`ingredients`, `recipes`, `orders`, `settings`) is stored as a subcollection under `/users/{userId}`.
   - Access to any subcollection or profile document is strictly restricted to the authenticated user whose `request.auth.uid == userId`.
   - Users cannot view, query, edit, or delete data belonging to other confectioners.
2. **ID Integrity**:
   - `userId`, `ingredientId`, `recipeId`, `orderId`, and `settingId` must conform to `isValidId()` (string <= 128 chars, matching `^[a-zA-Z0-9_\-]+$`).
   - The document's `userId` property must always match `request.auth.uid` on write.
3. **Data Type and Volumetric Bounds**:
   - Numeric quantities (prices, yields, margins, hours, kWh) must be non-negative numbers.
   - Text fields must not exceed their defined `maxLength` (names <= 128, descriptions/notes <= 5000 chars) to prevent Denial-of-Wallet attacks.
4. **Status Constraints on Orders**:
   - Order `status` can only be one of `['pendente', 'pronto', 'entregue']`.

---

## 2. The "Dirty Dozen" Threat Payloads

1. **Unauthenticated Read**: Attempting to read `/users/user_abc/recipes` with `request.auth = null`. (Expected: PERMISSION_DENIED)
2. **Cross-Tenant Read**: User B (`uid = user_xyz`) attempting to read `/users/user_abc/recipes/cake_123`. (Expected: PERMISSION_DENIED)
3. **Cross-Tenant Write**: User B attempting to create an order inside `/users/user_abc/orders/ord_99`. (Expected: PERMISSION_DENIED)
4. **ID Poisoning Attack**: Attempting to write to `/users/{userId}/recipes/{recipeId}` with a 2000-character malicious string ID. (Expected: PERMISSION_DENIED)
5. **Ghost Field Injection**: Adding an unpermitted root field `isAdmin: true` to `/users/{userId}`. (Expected: PERMISSION_DENIED)
6. **Payload Bloat Attack**: Writing an ingredient with a 50KB name string to exhaust storage. (Expected: PERMISSION_DENIED)
7. **Negative Price Injection**: Creating an ingredient with `price: -50.00`. (Expected: PERMISSION_DENIED)
8. **Invalid Order Status**: Updating an order status to `'cancelado_hack'` or `'refunded'`. (Expected: PERMISSION_DENIED)
9. **Blanket Query Scraping**: Running a collectionGroup query across all users' orders. (Expected: PERMISSION_DENIED)
10. **Ownership Hijack**: User A creating a recipe with `userId: 'user_other'`. (Expected: PERMISSION_DENIED)
11. **Negative Yield/Margin**: Setting recipe yield to `-10` or margin to `NaN`. (Expected: PERMISSION_DENIED)
12. **Settings Alteration by Non-Owner**: Attempting to overwrite another user's energy/gas cost parameters. (Expected: PERMISSION_DENIED)
