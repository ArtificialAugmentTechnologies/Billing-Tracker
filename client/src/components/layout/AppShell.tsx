import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { readStorage, writeStorage } from '@/lib/utils';
import { CommandPalette } from './CommandPalette';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const COLLAPSED_KEY = 'a2-sidebar-collapsed';

export function AppShell() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => readStorage(COLLAPSED_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const openOnShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', openOnShortcut);
    return () => window.removeEventListener('keydown', openOnShortcut);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeStorage(COLLAPSED_KEY, String(next));
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} className="hidden lg:flex" />

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-navy/50"
              onClick={() => setMobileOpen(false)}
            />
            <Sidebar
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              className="relative z-10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mx-auto max-w-7xl"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
