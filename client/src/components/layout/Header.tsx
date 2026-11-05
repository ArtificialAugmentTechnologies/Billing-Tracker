import { LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useLogout } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { NAV_ITEMS } from './nav';

interface HeaderProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

export function Header({ onOpenMenu, onOpenSearch }: HeaderProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

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

      <div className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onOpenSearch} aria-label="Search">
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Search</span>
          <kbd className="ml-2 hidden font-mono text-[10px] text-muted-foreground md:inline">
            Ctrl K
          </kbd>
        </Button>
        {user && (
          <span className="mx-2 hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
        )}
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" aria-hidden />
        </Button>
      </div>
    </header>
  );
}
