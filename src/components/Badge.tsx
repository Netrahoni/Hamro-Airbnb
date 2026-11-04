import type { ReactNode } from 'react';

export default function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'blue' | 'rose' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
