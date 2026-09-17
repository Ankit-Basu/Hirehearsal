import { cn } from '@/lib/cn';

/**
 * Word-by-word blur reveal, done with CSS animations.
 *
 * Deliberately not JavaScript-driven: a question or headline must never be left invisible because an
 * animation frame loop was throttled (background tab, heavy page, reduced-motion setting).
 */
export function RevealText({
  text,
  as: Tag = 'p',
  className,
  stagger = 45,
}: {
  text: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  className?: string;
  stagger?: number;
}) {
  const words = text.split(' ').filter(Boolean);

  return (
    <Tag className={cn('flex flex-wrap', className)}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="reveal-word"
          style={{ animationDelay: `${Math.min(index * stagger, 900)}ms` }}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
