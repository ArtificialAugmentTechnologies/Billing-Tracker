import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="invoices" element={<PlaceholderPage title="Invoices" phase={6} />} />
          <Route path="clients" element={<PlaceholderPage title="Clients" phase={3} />} />
          <Route path="projects" element={<PlaceholderPage title="Projects" phase={3} />} />
          <Route path="payments" element={<PlaceholderPage title="Payments" phase={8} />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" phase={9} />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" phase={10} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
