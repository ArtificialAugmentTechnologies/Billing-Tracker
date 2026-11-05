import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That address doesn't exist, or the link is out of date."
        action={
          <Button asChild>
            <Link to="/">Go to the dashboard</Link>
          </Button>
        }
      />
    </Card>
  );
}
