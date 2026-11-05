import type { SearchKind, SearchResult } from '@a2/shared';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Building2, FileText, FolderKanban, Search, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/lib/queries';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';

const KINDS: Record<SearchKind, { icon: LucideIcon; path: string; label: string }> = {
  client: { icon: Building2, path: '/clients', label: 'Client' },
  project: { icon: FolderKanban, path: '/projects', label: 'Project' },
  invoice: { icon: FileText, path: '/invoices', label: 'Invoice' },
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const debounced = useDebouncedValue(query.trim(), 150);
  const search = useSearch(debounced);
  const results = debounced.length >= 2 ? (search.data ?? []) : [];

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  useEffect(() => setActive(0), [debounced, search.data]);

  const openResult = (result: SearchResult) => {
    onOpenChange(false);
    navigate(`${KINDS[result.kind].path}/${result.id}`);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActive((active + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActive((active - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      openResult(results[active]);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-card"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results.length ? `search-result-${active}` : undefined}
              aria-label="Search clients, projects and invoices"
              placeholder="Search clients, projects and invoices"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto">
            {results.map((result, index) => {
              const { icon: Icon, label } = KINDS[result.kind];
              return (
                <li
                  key={`${result.kind}-${result.id}`}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === active}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => openResult(result)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
                      index === active && 'bg-muted',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-orange" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.title}</span>
                      {result.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {debounced.length >= 2 && !search.isFetching && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No matches.</p>
          )}
          {debounced.length < 2 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Type at least two letters.
            </p>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
