import { useMemo, useState } from 'react';
import { Link2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCasesListQuery } from '@/services/cases/cases.queries';
import { CaseStatusBadge } from '@/features/cases/components/CaseBadges';
import {
  useInvolvedCasesQuery,
  useInvolvedListQuery,
  useLinkInvolvedMutation,
} from '@/services/involved/involved.queries';
import { INVOLVEMENT_TYPES, type InvolvementType } from '@/services/involved/involved.types';
import { isNormalizedApiError } from '@/services/http/errors';

type Mode = 'pick-case' | 'pick-person';

interface LinkToCaseDialogProps {
  mode: Mode;
  /** Required when mode === 'pick-case' (person is fixed). */
  personId?: string;
  /** Required when mode === 'pick-person' (case is fixed). */
  caseId?: string;
  triggerLabel?: string;
  /** Person ids already linked to the case — hidden from the person picker. */
  excludePersonIds?: string[] | undefined;
}

// We fetch a page and filter client-side because neither GET /cases nor
// GET /involved-persons accepts a search param.
const PICKER_LIMIT = 100;

interface PickedCase {
  id: string;
  label: string;
}
interface PickedPerson {
  id: string;
  label: string;
}

export function LinkToCaseDialog({
  mode,
  personId,
  caseId,
  triggerLabel,
  excludePersonIds,
}: LinkToCaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [pickedCase, setPickedCase] = useState<PickedCase | null>(null);
  const [pickedPerson, setPickedPerson] = useState<PickedPerson | null>(null);
  const [involvementType, setInvolvementType] = useState<InvolvementType>('WITNESS');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState<string | null>(null);

  const linkMut = useLinkInvolvedMutation();

  const reset = () => {
    setPickedCase(null);
    setPickedPerson(null);
    setInvolvementType('WITNESS');
    setObservations('');
    setError(null);
  };

  const effectivePersonId = mode === 'pick-case' ? personId : pickedPerson?.id;
  const effectiveCaseId = mode === 'pick-person' ? caseId : pickedCase?.id;
  const canSubmit =
    !!effectivePersonId && !!effectiveCaseId && !linkMut.isPending;

  const onSubmit = async () => {
    setError(null);
    if (!effectivePersonId || !effectiveCaseId) {
      setError(mode === 'pick-case' ? 'Pick a case first.' : 'Pick a person first.');
      return;
    }
    try {
      await linkMut.mutateAsync({
        personId: effectivePersonId,
        caseId: effectiveCaseId,
        input: {
          involvementType,
          ...(observations.trim() ? { observations: observations.trim() } : {}),
        },
      });
      toast.success('Linked to case');
      reset();
      setOpen(false);
    } catch (err) {
      if (!isNormalizedApiError(err)) {
        setError('Unexpected error. Try again.');
        return;
      }
      if (err.status === 409) {
        setError(err.message || 'This person is already linked to this case.');
        return;
      }
      if (err.status === 404) {
        setError('Person or case no longer exists.');
        return;
      }
      if (err.status !== 403) setError(err.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Link2 className="mr-2 h-4 w-4" /> {triggerLabel ?? 'Link to a case'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'pick-case' ? 'Link person to a case' : 'Link a person to this case'}</DialogTitle>
          <DialogDescription>
            {mode === 'pick-case'
              ? 'Choose a case and the involvement type.'
              : 'Choose a registered person and the involvement type.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'pick-case' ? (
            <CasePicker value={pickedCase} onChange={setPickedCase} excludePersonId={personId} />
          ) : (
            <PersonPicker
              value={pickedPerson}
              onChange={setPickedPerson}
              excludeIds={excludePersonIds}
            />
          )}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Involvement type</p>
            <Select value={involvementType} onValueChange={(v) => setInvolvementType(v as InvolvementType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOLVEMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Observations</p>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Optional notes about this link"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={linkMut.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {linkMut.isPending ? 'Linking…' : 'Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CasePicker({
  value,
  onChange,
  excludePersonId,
}: {
  value: PickedCase | null;
  onChange: (next: PickedCase | null) => void;
  /** When set, cases this person is already linked to are hidden. */
  excludePersonId?: string | undefined;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim().toLowerCase(), 200);
  const list = useCasesListQuery({ page: 1, limit: PICKER_LIMIT });
  const linkedCases = useInvolvedCasesQuery(excludePersonId);

  const excludedCaseIds = useMemo(
    () => new Set((linkedCases.data ?? []).map((l) => l.caseId)),
    [linkedCases.data],
  );

  const results = useMemo(() => {
    const all = (list.data?.data ?? []).filter((c) => !excludedCaseIds.has(c.id));
    if (!debounced) return all.slice(0, 8);
    return all
      .filter(
        (c) =>
          c.title.toLowerCase().includes(debounced) ||
          c.caseCode.toLowerCase().includes(debounced),
      )
      .slice(0, 8);
  }, [list.data, debounced, excludedCaseIds]);

  if (value) {
    return (
      <SelectedRow label={value.label} onClear={() => onChange(null)} />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Case</p>
      <SearchInput value={query} onChange={setQuery} placeholder="Search by title or code" />
      {list.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading cases…</p>
      ) : (
        <ul className="max-h-48 divide-y divide-border overflow-auto rounded-md border border-border bg-card">
          {results.length === 0 ? (
            <li className="p-3 text-xs text-muted-foreground">No matching case.</li>
          ) : (
            results.map((c) => (
              <li key={c.id} className="p-1">
                <button
                  type="button"
                  onClick={() => onChange({ id: c.id, label: `${c.caseCode} · ${c.title}` })}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{c.caseCode}</span>
                  </span>
                  <CaseStatusBadge status={c.status} />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function PersonPicker({
  value,
  onChange,
  excludeIds,
}: {
  value: PickedPerson | null;
  onChange: (next: PickedPerson | null) => void;
  /** Person ids already linked to the case — hidden from results. */
  excludeIds?: string[] | undefined;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim().toLowerCase(), 200);
  const list = useInvolvedListQuery({ page: 1, limit: PICKER_LIMIT });

  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  const results = useMemo(() => {
    const all = (list.data?.data ?? []).filter((p) => !excluded.has(p.id));
    const named = (p: { firstNames: string; lastNames?: string | null; document?: string | null }) =>
      `${p.firstNames} ${p.lastNames ?? ''} ${p.document ?? ''}`.toLowerCase();
    if (!debounced) return all.slice(0, 8);
    return all.filter((p) => named(p).includes(debounced)).slice(0, 8);
  }, [list.data, debounced, excluded]);

  if (value) {
    return <SelectedRow label={value.label} onClear={() => onChange(null)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Person</p>
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name or document" />
      {list.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading people…</p>
      ) : (
        <ul className="max-h-48 divide-y divide-border overflow-auto rounded-md border border-border bg-card">
          {results.length === 0 ? (
            <li className="p-3 text-xs text-muted-foreground">No matching person.</li>
          ) : (
            results.map((p) => {
              const name = `${p.firstNames} ${p.lastNames ?? ''}`.trim();
              return (
                <li key={p.id} className="p-1">
                  <button
                    type="button"
                    onClick={() => onChange({ id: p.id, label: name })}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                      {p.document && (
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {p.document}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        autoComplete="off"
      />
    </div>
  );
}

function SelectedRow({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-medium text-foreground">{label}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Change
      </Button>
    </div>
  );
}
