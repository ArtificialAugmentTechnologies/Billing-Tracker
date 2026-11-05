import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { LogoMark } from '@/components/brand/LogoMark';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggle, onNavigate, className }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex h-full shrink-0 flex-col overflow-hidden bg-navy text-cream', className)}
    >
      <div className={cn('flex h-20 items-center', collapsed ? 'justify-center' : 'px-5')}>
        {collapsed ? (
          <LogoMark variant="reversed" className="h-9 w-9" />
        ) : (
          <Logo variant="reversed" className="text-lg" />
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-xl text-sm font-medium transition-colors focus-visible:ring-offset-navy',
                collapsed ? 'justify-center' : 'px-3',
                isActive
                  ? 'bg-orange text-navy'
                  : 'text-grey-navy hover:bg-white/10 hover:text-cream',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {!collapsed && <span>{label}</span>}
            {collapsed && <span className="sr-only">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'm-3 flex h-10 items-center gap-3 rounded-xl text-sm text-grey-navy transition-colors hover:bg-white/10 hover:text-cream focus-visible:ring-offset-navy',
            collapsed ? 'justify-center' : 'px-3',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
              Collapse
            </>
          )}
        </button>
      )}
    </motion.aside>
  );
}
