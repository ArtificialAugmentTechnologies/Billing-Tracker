import { Logo } from '@/components/brand/Logo';
import { Card } from '@/components/ui/card';
import { PlaceholderPage } from './PlaceholderPage';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PlaceholderPage title="Dashboard" phase={9} />

      <section aria-labelledby="brand-check" className="grid gap-6 md:grid-cols-2">
        <h2 id="brand-check" className="sr-only">
          Logo variants
        </h2>
        <Card className="flex items-center justify-center bg-cream p-10">
          <Logo variant="color" className="text-3xl" />
        </Card>
        <Card className="flex items-center justify-center border-navy bg-navy p-10">
          <Logo variant="reversed" className="text-3xl" />
        </Card>
      </section>
    </div>
  );
}
