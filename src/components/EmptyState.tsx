import { AlertCircle, Loader2 } from 'lucide-react';

type EmptyStateProps = {
  state: 'loading' | 'error' | 'empty';
  title: string;
  detail?: string;
  onRetry?: () => void;
};

export function EmptyState({ state, title, detail, onRetry }: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state-${state}`}>
      {state === 'loading' ? <Loader2 className="spin" size={28} /> : <AlertCircle size={28} />}
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
      {onRetry ? (
        <button type="button" className="secondary-button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
