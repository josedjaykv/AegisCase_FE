import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EvidenceForm } from '../components/EvidenceForm';

export function EvidenceNewPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/cases/${id}/evidence` : '/evidence'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to evidence
      </Link>
      <EvidenceForm mode="create" caseId={id} />
    </section>
  );
}
