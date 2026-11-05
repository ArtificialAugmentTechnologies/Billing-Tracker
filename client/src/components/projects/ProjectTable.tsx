import { formatINR, type ProjectSummary } from '@a2/shared';
import { Link } from 'react-router-dom';
import { Table, tdClass, thClass } from '@/components/ui/page';
import { ProjectBadge } from './ProjectBadge';

export function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <th className={thClass}>Project</th>
          <th className={`${thClass} hidden md:table-cell`}>Client</th>
          <th className={`${thClass} text-right`}>Contract</th>
          <th className={`${thClass} hidden text-right sm:table-cell`}>Billed</th>
          <th className={`${thClass} hidden text-right lg:table-cell`}>Received</th>
          <th className={thClass}>Status</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr key={project.id} className="hover:bg-muted/40">
            <td className={tdClass}>
              <Link to={`/projects/${project.id}`} className="font-medium hover:text-orange">
                {project.name}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">{project.refCode}</p>
            </td>
            <td className={`${tdClass} hidden md:table-cell`}>{project.clientName}</td>
            <td className={`${tdClass} whitespace-nowrap text-right`}>
              {formatINR(project.contractValue)}
            </td>
            <td className={`${tdClass} hidden whitespace-nowrap text-right sm:table-cell`}>
              {formatINR(project.billed)}
            </td>
            <td className={`${tdClass} hidden whitespace-nowrap text-right lg:table-cell`}>
              {formatINR(project.received)}
            </td>
            <td className={tdClass}>
              <ProjectBadge status={project.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
