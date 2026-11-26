import { C4Architect, createC4History, type DesignTab } from "@modules/c4-editor";
import type { C4File } from "@modules/c4-model";
import { useI18n } from "@modules/i18n";
import { formatTaipeiDateTime } from "@modules/projects";
import { Button, Card, FeedbackBanner, IconButton, LoadingPanel } from "@shared/ui";
import { useAsyncLoad } from "@shared/useAsyncLoad";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { DesignVersion } from "../model/personalWorkspace";
import { loadDesignHistory } from "../services/workspaceApi";

function HistoryError({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  return (
    <FeedbackBanner kind="error" action={<Button onClick={retry}>{t("auth.retry")}</Button>}>
      {t("history.error")}
    </FeedbackBanner>
  );
}

function ModelSummary({
  model,
  peer,
  baseline,
}: {
  model: C4File;
  peer?: C4File;
  baseline: boolean;
}) {
  const { t } = useI18n();
  const labels = new Map(model.nodes.map((node) => [node.id, node.label || node.id]));
  const nodes = new Map(peer?.nodes.map((node) => [node.id, node]));
  const edges = new Map(peer?.relationships.map((edge) => [edge.id, edge]));
  function change(item: object, other?: object) {
    if (!peer || JSON.stringify(item) === JSON.stringify(other)) return null;
    return (
      <span className="ml-2 text-xs font-semibold text-primary">
        {t(other ? "history.modified" : baseline ? "history.removed" : "history.added")}
      </span>
    );
  }
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">{t("history.nodes", { count: model.nodes.length })}</h4>
      <ul className="space-y-1">
        {model.nodes.map((node) => (
          <li key={node.id}>
            <details>
              <summary className="cursor-pointer break-words">
                {node.parentId && labels.get(node.parentId) + " › "}
                {labels.get(node.id)} · {node.kind}
                {change(node, nodes.get(node.id))}
              </summary>
              <pre className="whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(node, null, 2)}
              </pre>
            </details>
          </li>
        ))}
      </ul>
      <h4 className="font-semibold">{t("history.edges", { count: model.relationships.length })}</h4>
      <ul className="space-y-1">
        {model.relationships.map((edge) => (
          <li key={edge.id}>
            <details>
              <summary className="cursor-pointer break-words">
                {labels.get(edge.source)} → {labels.get(edge.target)} · {edge.label}
                {change(edge, edges.get(edge.id))}
              </summary>
              <pre className="whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(edge, null, 2)}
              </pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

type HistoryProps = { projectId: string; accountId: string; tab: DesignTab };

function useVersion(projectId: string, accountId: string, version: number) {
  return useAsyncLoad(
    (signal) => loadDesignHistory<DesignVersion>(projectId, accountId, version, signal),
    { key: JSON.stringify([projectId, accountId, version]) },
  );
}

function VersionPane({
  tab,
  result,
  peer,
  version,
  min,
  max,
  baseline,
  onChange,
  onView,
}: {
  tab: DesignTab;
  result: ReturnType<typeof useVersion>;
  peer: DesignVersion | null;
  version: number;
  min: number;
  max: number;
  baseline: boolean;
  onChange: (value: number) => void;
  onView: (value: DesignVersion) => void;
}) {
  const { t } = useI18n();
  const label = t(baseline ? "history.from" : "history.to");
  return (
    <Card as="section" className="min-w-0 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{label}</h3>
        <span className="font-mono text-sm">{t("history.version", { version })}</span>
      </div>
      <div className="flex items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          label={t("history.previous", { label })}
          disabled={version <= min}
          onClick={() => onChange(version - 1)}
        />
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          value={version}
          disabled={min === max}
          onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
          className="w-full accent-primary"
        />
        <IconButton
          icon={ChevronRight}
          label={t("history.next", { label })}
          disabled={version >= max}
          onClick={() => onChange(version + 1)}
        />
      </div>
      {result.error ? (
        <HistoryError retry={result.reload} />
      ) : result.data ? (
        <>
          <p className="text-xs text-on-muted">
            {formatTaipeiDateTime(result.data.editedAt)} (UTC+8)
          </p>
          {tab === "readme" ? (
            <pre className="whitespace-pre-wrap break-words text-sm">
              {result.data.designDoc || t("history.blankReadme")}
            </pre>
          ) : (
            <>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => result.data && onView(result.data)}
              >
                {t("history.viewDiagram")}
              </Button>
              <ModelSummary model={result.data.model} peer={peer?.model} baseline={baseline} />
            </>
          )}
        </>
      ) : (
        <LoadingPanel label={t("common.loading")} />
      )}
    </Card>
  );
}

function CompareVersions({ total, ...props }: HistoryProps & { total: number }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(total);
  const [diagram, setDiagram] = useState<DesignVersion | null>(null);
  const start = useVersion(props.projectId, props.accountId, from);
  const end = useVersion(props.projectId, props.accountId, to);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{t("history.heading", { total })}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <VersionPane
          tab={props.tab}
          result={start}
          peer={end.data}
          baseline
          version={from}
          min={1}
          max={to}
          onChange={(n) => {
            setFrom(n);
            setDiagram(null);
          }}
          onView={setDiagram}
        />
        <VersionPane
          tab={props.tab}
          result={end}
          peer={start.data}
          baseline={false}
          version={to}
          min={from}
          max={total}
          onChange={(n) => {
            setTo(n);
            setDiagram(null);
          }}
          onView={setDiagram}
        />
      </div>
      {props.tab === "diagram" && diagram && (
        <section className="space-y-3">
          <h3 className="font-bold">
            {t("history.version", { version: diagram.version })} · C4 Model
          </h3>
          <C4Architect
            key={diagram.version}
            history={createC4History(diagram.model)}
            designDoc={diagram.designDoc}
            designTab="diagram"
            readOnly
            dispatchModel={() => {}}
            onChangeDesignDoc={() => {}}
            onChangeDesignTab={() => {}}
          />
        </section>
      )}
    </section>
  );
}

export function DesignHistory(props: HistoryProps) {
  const { t } = useI18n();
  const result = useAsyncLoad(
    (signal) =>
      loadDesignHistory<{ total: number }>(props.projectId, props.accountId, null, signal),
    { key: JSON.stringify([props.projectId, props.accountId]) },
  );
  if (result.error) return <HistoryError retry={result.reload} />;
  if (!result.data) return <LoadingPanel label={t("common.loading")} />;
  if (!result.data.total)
    return (
      <Card as="section" className="p-6">
        {t("history.empty")}
      </Card>
    );
  return <CompareVersions {...props} total={result.data.total} />;
}
