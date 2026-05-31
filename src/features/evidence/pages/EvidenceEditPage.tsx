import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { isNormalizedApiError } from '@/services/http/errors';
import {
  readEvidenceFromCache,
  useTakeCustodyMutation,
  useViewedEvidence,
} from '@/services/evidence/evidence.queries';
import { EvidenceForm } from '../components/EvidenceForm';

export function EvidenceEditPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const viewed = useViewedEvidence(id).data;
  const cached = id ? readEvidenceFromCache(qc, id) : undefined;
  const e = viewed ?? cached;

  const userSub = useAuthStore((s) => s.user?.sub);
  const takeCustody = useTakeCustodyMutation(id ?? '');
  const isCustodian = !!e?.currentCustodianId && e.currentCustodianId === userSub;

  const onTakeCustody = async () => {
    try {
      await takeCustody.mutateAsync();
      toast.success('Custody transferred to you');
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to={id ? `/evidence/${id}` : '/evidence'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to evidence
      </Link>

      {!e ? (
        <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Open this evidence from its case list first, then edit — we don’t load the full record here
          to avoid recording you as the custodian.
        </div>
      ) : e.archived ? (
        <div
          role="alert"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          This evidence is archived and shouldn’t be edited.
        </div>
      ) : !isCustodian ? (
        <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            Only the current custodian can edit this evidence. Taking custody will be recorded in the
            chain of custody.
          </p>
          <Button size="sm" onClick={onTakeCustody} disabled={takeCustody.isPending}>
            {takeCustody.isPending ? 'Taking custody…' : 'Take custody & edit'}
          </Button>
        </div>
      ) : (
        <EvidenceForm mode="edit" initial={e} />
      )}
    </section>
  );
}
