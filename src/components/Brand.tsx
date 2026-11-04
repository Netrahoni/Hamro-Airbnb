import { Mountain } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="NepalStay AI home">
      <span className="brand-mark"><Mountain size={19} strokeWidth={2.2} /></span>
      <span className="brand-word">NepalStay<span>AI</span></span>
    </Link>
  );
}
