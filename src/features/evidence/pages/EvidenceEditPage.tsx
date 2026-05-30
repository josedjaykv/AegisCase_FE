import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  readEvidenceFromCache,
  useViewedEvidence,
} from '@/services/evidence/evidence.queries';
import { EvidenceForm } from '../components/EvidenceForm';

export function EvidenceEditPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const viewed = useViewedEvidence(id).data;
  const cached = id ? readEvidenceFromCache(qc, id) : undefined;
  const e = viewed ?? cached;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/evidence/${id}` : '/evidence'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to evidence
      </Link>

      {e ? (
        e.archived ? (
          <div
            role="alert"
            className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
          >
            This evidence is archived and shouldn’t be edited.
          </div>
        ) : (
          <EvidenceForm mode="edit" initial={e} />
        )
      ) : (
        <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Open this evidence from its case list first, then edit — we don’t load the full record here
          to avoid recording you as the custodian.
        </div>
      )}
    </section>
  );
}
