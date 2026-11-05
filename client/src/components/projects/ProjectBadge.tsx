import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@a2/shared';
import { StatusBadge, type BadgeTone } from '@/components/ui/status-badge';

const TONES: Record<ProjectStatus, BadgeTone> = {
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  ON_HOLD: 'warning',
};

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  return <StatusBadge tone={TONES[status]}>{PROJECT_STATUS_LABELS[status]}</StatusBadge>;
}
