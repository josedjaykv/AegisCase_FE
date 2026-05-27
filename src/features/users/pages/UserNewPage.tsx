import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserForm } from '../components/UserForm';

export function UserNewPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/users"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to users
      </Link>
      <UserForm mode="create" />
    </section>
  );
}
