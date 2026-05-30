import { Link } from 'react-router-dom';
import type { InvolvedPerson } from '@/services/involved/involved.types';

/** Mobile representation of an involved person (design-system §11). */
export function InvolvedCard({ person }: { person: InvolvedPerson }) {
  const name = `${person.firstNames} ${person.lastNames ?? ''}`.trim();
  return (
    <Link
      to={`/involved/${person.id}`}
      className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <h2 className="text-sm font-medium leading-tight text-foreground">{name}</h2>
      {person.document && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">{person.document}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Registered {new Date(person.createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
