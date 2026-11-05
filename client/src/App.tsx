import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppShell } from '@/components/layout/AppShell';
import { ClientDetailPage } from '@/pages/ClientDetailPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InvoiceBuilderPage } from '@/pages/InvoiceBuilderPage';
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceBuilderPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="invoices/:id/edit" element={<InvoiceBuilderPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
