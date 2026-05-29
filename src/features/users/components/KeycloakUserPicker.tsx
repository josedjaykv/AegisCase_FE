import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Search, ShieldAlert, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useKeycloakUsersSearch } from '@/services/auth/keycloakUsers.queries';
import type { KeycloakUser } from '@/services/auth/keycloakUsers.types';
import { isNormalizedApiError } from '@/services/http/errors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { RoleBadge } from './RoleBadge';

/**
 * - `provision` (default): selecting a Keycloak user to CREATE a new local
 *   profile. Users that already have a profile are disabled (would 409) and
 *   link to their existing profile.
 * - `assign`: selecting an existing app user (e.g. a case leader / team
 *   member). Only users that already have a local profile are selectable;
 *   un-provisioned Keycloak users are disabled with a "no profile yet" hint.
 */
type PickerMode = 'provision' | 'assign';

interface KeycloakUserPickerProps {
  value: KeycloakUser | null;
  onChange: (next: KeycloakUser | null) => void;
  mode?: PickerMode;
}

const MIN_SEARCH_LENGTH = 2;
const PAGE_LIMIT = 10;

export function KeycloakUserPicker({
  value,
  onChange,
  mode = 'provision',
}: KeycloakUserPickerProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = !value && debounced.length >= MIN_SEARCH_LENGTH;

  const search = useKeycloakUsersSearch(
    { search: debounced, page: 1, limit: PAGE_LIMIT },
    enabled,
  );

  if (value) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {value.firstName} {value.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{value.email}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{value.sub}</p>
            {value.role ? (
              <RoleBadge role={value.role} />
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-foreground">
                <ShieldAlert className="h-3 w-3" /> No app role in Keycloak
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setQuery('');
            }}
            aria-label="Clear selected Keycloak user"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or username"
          className="pl-9"
          autoComplete="off"
          aria-label="Search Keycloak users"
        />
      </div>

      {!enabled && query.trim().length > 0 && (
        <p className="text-xs text-muted-foreground">
          Type at least {MIN_SEARCH_LENGTH} characters to search.
        </p>
      )}

      {enabled && search.isLoading && (
        <div className="space-y-2 rounded-md border border-border bg-card p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {enabled && search.isError && (
        <ResultsError error={search.error} />
      )}

      {enabled && search.data && (
        <ResultsList
          results={search.data.data}
          mode={mode}
          onSelect={(u) => {
            onChange(u);
            setQuery('');
          }}
        />
      )}
    </div>
  );
}

function ResultsList({
  results,
  mode,
  onSelect,
}: {
  results: KeycloakUser[];
  mode: PickerMode;
  onSelect: (u: KeycloakUser) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground">
        No Keycloak user matches that search.
        <span className="ml-1 text-foreground">
          {mode === 'provision'
            ? 'Create the user in Keycloak first, then come back.'
            : 'They must exist in Keycloak to be assigned.'}
        </span>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card">
      {results.map((u) => {
        // provision: can only pick users WITHOUT a local profile.
        // assign: can only pick users WITH a local profile.
        const disabled = mode === 'provision' ? u.provisioned : !u.provisioned;
        return (
          <li key={u.sub} className="p-2">
            <button
              type="button"
              onClick={() => !disabled && onSelect(u)}
              disabled={disabled}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {u.firstName} {u.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.role ? (
                  <RoleBadge role={u.role} />
                ) : (
                  <span className="rounded-full border border-warning/40 px-2 py-0.5 text-[10px] uppercase text-foreground">
                    no role
                  </span>
                )}
                {mode === 'provision' && u.provisioned && u.userServiceId ? (
                  <Link
                    to={`/users/${u.userServiceId}`}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open profile
                  </Link>
                ) : mode === 'assign' && !u.provisioned ? (
                  <span className="text-xs text-muted-foreground">No profile yet</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Select</span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ResultsError({ error }: { error: unknown }) {
  const status = isNormalizedApiError(error) ? error.status : 0;
  const message =
    status === 404
      ? 'Keycloak search endpoint is not available yet. Ask the backend team to ship GET /auth/keycloak-users.'
      : status === 403
        ? 'You do not have permission to query Keycloak.'
        : isNormalizedApiError(error)
          ? error.message
          : 'Could not reach Keycloak.';
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
