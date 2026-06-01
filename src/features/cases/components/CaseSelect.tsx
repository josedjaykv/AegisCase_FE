import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCasesListQuery } from '@/services/cases/cases.queries';

const ALL = '__ALL__';

interface CaseSelectProps {
  value: string | undefined;
  onChange: (caseId: string | undefined) => void;
  /** Include an "All cases" option (for filters). */
  allowAll?: boolean;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Reusable case chooser backed by GET /cases (readable by all roles). Used as a
 * filter (with allowAll) and in the task form to assign a task to any case.
 * Lists up to 100 cases; a searchable variant can come later if needed.
 */
export function CaseSelect({
  value,
  onChange,
  allowAll,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: CaseSelectProps) {
  const query = useCasesListQuery({ page: 1, limit: 100 });
  const cases = query.data?.data ?? [];

  return (
    <Select
      value={value ?? (allowAll ? ALL : '')}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger className={className} aria-label={ariaLabel ?? 'Select a case'}>
        <SelectValue placeholder={placeholder ?? 'Select a case'} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL}>All cases</SelectItem>}
        {cases.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="font-mono text-xs">{c.caseCode}</span> · {c.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
