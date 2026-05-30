import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InvolvedForm } from '../components/InvolvedForm';

export function InvolvedNewPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/involved"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to involved persons
      </Link>
      <InvolvedForm mode="create" />
    </section>
  );
}
