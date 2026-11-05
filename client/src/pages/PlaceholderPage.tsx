import { Card } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  phase: number;
}

/** Temporary stand-in until the page is built in its phase. */
export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <Card className="p-8">
      <p className="section-label">Coming in phase {phase}</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{title}</h1>
    </Card>
  );
}
