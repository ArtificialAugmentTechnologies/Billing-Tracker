import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

/** Keeps a crash in one page from leaving the whole app blank. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-4 text-center text-foreground">
        <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          Your saved work is safe. Reload to continue.
        </p>
        <Button onClick={() => window.location.assign('/')}>Reload</Button>
      </div>
    );
  }
}
