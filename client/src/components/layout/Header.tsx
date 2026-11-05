import { Menu, Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { NAV_ITEMS } from './nav';

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const current = NAV_ITEMS.find((item) =>
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to),
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      <p className="font-heading text-lg font-semibold">{current?.label ?? 'Billing Tracker'}</p>

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" aria-hidden />
          ) : (
            <Moon className="h-5 w-5" aria-hidden />
          )}
        </Button>
      </div>
    </header>
  );
}
