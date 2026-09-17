import { ButtonLink } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/Surface';

export default function NotFound() {
  return (
    <GlassCard className="mx-auto mt-16 max-w-md p-8 text-center">
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="mt-2 text-xl font-semibold text-fg">That page is not in the building</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The interview room you are looking for may have ended, or the link is wrong.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <ButtonLink href="/start" variant="primary">
          Start an interview
        </ButtonLink>
        <ButtonLink href="/" variant="ghost">
          Home
        </ButtonLink>
      </div>
    </GlassCard>
  );
}
