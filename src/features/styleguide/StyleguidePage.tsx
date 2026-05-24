import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TOKENS = [
  { name: '--background', tone: 'bg-background border border-border text-foreground' },
  { name: '--foreground', tone: 'bg-foreground text-background' },
  { name: '--muted', tone: 'bg-muted text-muted-foreground' },
  { name: '--card', tone: 'bg-card border border-border text-foreground' },
  { name: '--primary', tone: 'bg-primary text-primary-foreground' },
  { name: '--accent', tone: 'bg-accent text-foreground' },
  { name: '--destructive', tone: 'bg-destructive text-destructive-foreground' },
  { name: '--warning', tone: 'bg-warning text-warning-foreground' },
  { name: '--success', tone: 'bg-success text-success-foreground' },
  { name: '--info', tone: 'bg-info text-info-foreground' },
];

const CASE_STATUS = [
  { value: 'OPEN', tone: 'info' as const },
  { value: 'UNDER_INVESTIGATION', tone: 'primary' as const },
  { value: 'PAUSED', tone: 'neutral' as const },
  { value: 'CLOSED', tone: 'success' as const },
];

const TASK_STATUS = [
  { value: 'PENDING', tone: 'neutral' as const },
  { value: 'IN_PROGRESS', tone: 'info' as const },
  { value: 'COMPLETED', tone: 'success' as const },
  { value: 'OVERDUE', tone: 'destructive' as const },
  { value: 'CANCELLED', tone: 'neutral' as const },
];

const PRIORITY = [
  { value: 'LOW', tone: 'neutral' as const },
  { value: 'MEDIUM', tone: 'info' as const },
  { value: 'HIGH', tone: 'warning' as const },
  { value: 'CRITICAL', tone: 'destructive' as const },
];

const EVIDENCE_STATUS = [
  { value: 'REGISTERED', tone: 'info' as const },
  { value: 'IN_CUSTODY', tone: 'primary' as const },
  { value: 'TRANSFERRED', tone: 'warning' as const },
  { value: 'ARCHIVED', tone: 'neutral' as const },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StyleguidePage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Style Guide</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dev-only reference for §4.6 of CLAUDE.md. Toggle theme + role from the top bar to verify.
        </p>
      </header>

      <Section title="Color tokens">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOKENS.map((t) => (
            <div
              key={t.name}
              className={`flex h-16 items-center justify-between rounded-md px-4 font-mono text-xs ${t.tone}`}
            >
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography scale">
        <div className="space-y-2">
          <p className="text-2xl font-semibold">text-2xl · Dashboard heading</p>
          <p className="text-xl font-semibold">text-xl · Page title</p>
          <p className="text-lg font-semibold">text-lg · Section title</p>
          <p className="text-base">text-base · Form input</p>
          <p className="text-sm">text-sm · Body / tables</p>
          <p className="text-xs text-muted-foreground">text-xs · Metadata</p>
          <p className="font-mono text-sm">font-mono · 550e8400-e29b-41d4-a716-446655440000</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="CaseStatus">
        <div className="flex flex-wrap gap-2">
          {CASE_STATUS.map((s) => (
            <Badge key={s.value} tone={s.tone}>
              {s.value}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="TaskStatus">
        <div className="flex flex-wrap gap-2">
          {TASK_STATUS.map((s) => (
            <Badge key={s.value} tone={s.tone}>
              {s.value}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Priority (Case / Task)">
        <div className="flex flex-wrap gap-2">
          {PRIORITY.map((s) => (
            <Badge key={s.value} tone={s.tone}>
              {s.value}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="EvidenceStatus">
        <div className="flex flex-wrap gap-2">
          {EVIDENCE_STATUS.map((s) => (
            <Badge key={s.value} tone={s.tone}>
              {s.value}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Responsive breakpoints">
        <div className="rounded-md border border-border bg-card p-4 text-sm">
          <p>
            Current viewport:
            <span className="ml-2 inline sm:hidden">
              <Badge tone="destructive">&lt; sm (mobile)</Badge>
            </span>
            <span className="ml-2 hidden sm:inline md:hidden">
              <Badge tone="warning">sm</Badge>
            </span>
            <span className="ml-2 hidden md:inline lg:hidden">
              <Badge tone="info">md (tablet)</Badge>
            </span>
            <span className="ml-2 hidden lg:inline xl:hidden">
              <Badge tone="primary">lg</Badge>
            </span>
            <span className="ml-2 hidden xl:inline 2xl:hidden">
              <Badge tone="success">xl (desktop)</Badge>
            </span>
            <span className="ml-2 hidden 2xl:inline">
              <Badge tone="success">2xl (wide)</Badge>
            </span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Resize the window to verify §4.6.11 behavior.
          </p>
        </div>
      </Section>
    </div>
  );
}
