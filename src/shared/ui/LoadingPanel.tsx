export function LoadingPanel({ label }: { label: string }) {
  return (
    <div role="status" className="p-6 text-sm text-on-muted">
      {label}
    </div>
  );
}
