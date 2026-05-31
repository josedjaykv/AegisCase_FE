import { useState } from 'react';
import { ChevronLeft, Eye, ListTree, Pencil, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGate } from '@/auth/RoleGate';
import { useDisplayNames } from '@/services/users/users.queries';
import { useAuthStore } from '@/stores/auth.store';
import {
  readEvidenceFromCache,
  useEvidenceChainQuery,
  useTakeCustodyMutation,
  useViewedEvidence,
} from '@/services/evidence/evidence.queries';
import { formatDateTime } from '@/lib/date';
import { ArchivedPill, EvidenceStatusBadge, EvidenceTypeBadge } from '../components/EvidenceBadges';
import { EvidenceViewDialog } from '../components/EvidenceViewDialog';
import { TransferCustodyDialog } from '../components/TransferCustodyDialog';
import { EvidenceArchiveButton } from '../components/EvidenceArchiveButton';
import { CustodyChainTimeline } from '../components/CustodyChainTimeline';
import { MediaGallery } from '@/features/media/components/MediaGallery';
import { EntityAuditPanel } from '@/features/audit/components/EntityAuditPanel';

export function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);

  // Full entity is only ever present AFTER the user confirms the view dialog
  // (which calls the side-effecting GET /evidence/:id). We never auto-fetch it.
  const viewed = useViewedEvidence(id).data;
  // Read-only summary from any cached list (no network, no side effect).
  const cached = id ? readEvidenceFromCache(qc, id) : undefined;
  const e = viewed ?? cached;

  // Chain of custody is the read-only endpoint — safe to fetch automatically.
  const chainQuery = useEvidenceChainQuery(id);

  const custodianSub = e?.currentCustodianId ?? undefined;
  const { displayName } = useDisplayNames(custodianSub ? [custodianSub] : []);

  // Custody gate for the media gallery: downloading evidence files requires
  // holding custody (Option C). Viewing stays open.
  const userSub = useAuthStore((s) => s.user?.sub);
  const takeCustody = useTakeCustodyMutation(id ?? '');
  const isCustodian = !!custodianSub && custodianSub === userSub;

  const backTo = e ? `/cases/${e.caseId}/evidence` : '/evidence';

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link
        to={backTo}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to evidence
      </Link>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {e ? <EvidenceTypeBadge type={e.evidenceType} /> : null}
            {e ? <EvidenceStatusBadge status={e.evidenceStatus} /> : null}
            {e?.archived && <ArchivedPill />}
          </div>
          <CardTitle className="text-lg">
            {e ? e.description : 'Evidence'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {e ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Current custodian</dt>
                <dd className="truncate">
                  {custodianSub
                    ? (displayName(custodianSub) ?? (
                        <span className="font-mono text-xs">{custodianSub}</span>
                      ))
                    : '—'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Registered</dt>
                <dd>{formatDateTime(e.createdAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              A read-only summary isn’t cached for this item. You can inspect its chain of custody
              below without side effects, or take custody to load the full record.
            </p>
          )}

          {/* Side-effect warning + actions */}
          <div className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
            <p className="flex items-start gap-2 text-xs text-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              Opening the full record records you as the current custodian. Use the chain of custody
              for read-only inspection.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setViewOpen(true)} disabled={!id}>
                <Eye className="mr-2 h-4 w-4" /> View &amp; take custody
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/evidence/${id}/chain`}>
                  <ListTree className="mr-2 h-4 w-4" /> Chain of custody
                </Link>
              </Button>
            </div>
          </div>

          {/* Mutating actions */}
          {e && !e.archived && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <RoleGate roles={['ADMIN', 'DETECTIVE']}>
                <TransferCustodyDialog evidenceId={e.id} />
                <Button asChild variant="outline" size="sm">
                  <Link to={`/evidence/${e.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
              </RoleGate>
              <EvidenceArchiveButton evidence={e} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-only chain preview */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Chain of custody</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/evidence/${id}/chain`}>Open full view</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {chainQuery.isError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              Failed to load the chain of custody.
            </div>
          ) : (
            <CustodyChainTimeline chain={chainQuery.data} isLoading={chainQuery.isLoading} />
          )}
        </CardContent>
      </Card>

      {/* Media — keyed off the route id, so it never triggers the side-effecting view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Media</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Files attached to this evidence.</p>
        </CardHeader>
        <CardContent>
          <MediaGallery
            entityType="EVIDENCE"
            entityId={id}
            readOnly={e?.archived}
            custodyGate={{
              isCustodian,
              takeCustody: async () => {
                await takeCustody.mutateAsync();
              },
            }}
          />
        </CardContent>
      </Card>

      <RoleGate roles={['ADMIN']}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Audit trail for this evidence.</p>
          </CardHeader>
          <CardContent>
            <EntityAuditPanel entityType="Evidence" entityId={id} />
          </CardContent>
        </Card>
      </RoleGate>

      {id && (
        <EvidenceViewDialog open={viewOpen} onOpenChange={setViewOpen} evidenceId={id} />
      )}
    </section>
  );
}
