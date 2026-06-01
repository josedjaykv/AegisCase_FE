import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/services/audit/audit.types';
import { actionLabel, entityTypeLabel } from '../auditCatalog';

export interface AuditFilterValues {
  entityType?: string | undefined;
  action?: string | undefined;
  userId?: string | undefined;
  entityId?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
}

const ALL = 'ALL';

/**
 * Self-contained filter bar. Owns the form state (initialized from the URL for
 * deep-linking) and emits the effective filters via `onChange`; the page writes
 * them to the URL. Text fields are debounced so typing doesn't refetch per key.
 */
export function AuditFilters({
  initial,
  onChange,
}: {
  initial: AuditFilterValues;
  onChange: (values: AuditFilterValues) => void;
}) {
  const [entityType, setEntityType] = useState(initial.entityType ?? '');
  const [action, setAction] = useState(initial.action ?? '');
  const [userId, setUserId] = useState(initial.userId ?? '');
  const [entityId, setEntityId] = useState(initial.entityId ?? '');
  const [fromDate, setFromDate] = useState(initial.fromDate ?? '');
  const [toDate, setToDate] = useState(initial.toDate ?? '');

  const dUserId = useDebouncedValue(userId);
  const dEntityId = useDebouncedValue(entityId);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    onChange({
      entityType: entityType || undefined,
      action: action || undefined,
      userId: dUserId.trim() || undefined,
      entityId: dEntityId.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    // onChange is stable from the page; intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action, dUserId, dEntityId, fromDate, toDate]);

  const hasAny = !!(entityType || action || userId || entityId || fromDate || toDate);

  const clear = () => {
    setEntityType('');
    setAction('');
    setUserId('');
    setEntityId('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Entity type</Label>
        <Select
          value={entityType || ALL}
          onValueChange={(v) => setEntityType(v === ALL ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entities</SelectItem>
            {AUDIT_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {entityTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Action</Label>
        <Select value={action || ALL} onValueChange={(v) => setAction(v === ALL ? '' : v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ALL}>All actions</SelectItem>
            {AUDIT_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-user">User ID</Label>
        <Input
          id="audit-user"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Keycloak sub"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-entity-id">Entity ID</Label>
        <Input
          id="audit-entity-id"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="Entity UUID"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-from">From</Label>
        <Input
          id="audit-from"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-to">To</Label>
        <Input
          id="audit-to"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      {hasAny && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="mr-2 h-4 w-4" /> Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
