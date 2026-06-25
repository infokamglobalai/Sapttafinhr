/**
 * dashboard_app/App.tsx
 *
 * Shell rendered at /app/* inside the marketing site's React tree.
 * It acts as the in-browser product hub:
 *  - /app          → ProductSwitcher (choose Finance or HR)
 *  - /app/billing  → Billing page  (handled by the parent router in App.tsx)
 *
 * The real Finance & HR apps are separate deployed products that are launched
 * externally via openFinanceApp() / openHrApp() from the ProductSwitcher.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import ProductSwitcher from '../pages/app/ProductSwitcher';

export default function DashboardApp() {
  return (
    <Routes>
      {/* Default landing → product switcher */}
      <Route index element={<ProductSwitcher />} />

      {/* Catch-all: redirect unknown sub-paths back to the switcher */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
