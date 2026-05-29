import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CaseForm } from '../components/CaseForm';

export function CaseNewPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/cases"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to cases
      </Link>
      <CaseForm mode="create" />
    </section>
  );
}
