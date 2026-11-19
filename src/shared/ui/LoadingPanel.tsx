import { Loader2 } from "lucide-react";

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center p-8">
      <div className="ui-panel inline-flex items-center gap-3 rounded-full px-5 py-3 shadow-m3-1">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium text-on-muted">{label}</span>
      </div>
    </div>
  );
}
