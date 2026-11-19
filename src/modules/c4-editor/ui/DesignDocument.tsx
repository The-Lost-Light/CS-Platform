import { useI18n } from "@modules/i18n";
import { Code2, Eye, FileText } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DesignDocument({
  designDoc,
  onChangeDesignDoc,
  readmeMode,
  setReadmeMode,
}: {
  designDoc: string;
  onChangeDesignDoc: (doc: string) => void;
  readmeMode: "reading" | "source";
  setReadmeMode: Dispatch<SetStateAction<"reading" | "source">>;
}) {
  const { t } = useI18n();
  return (
    <div
      role="tabpanel"
      id="design-panel-readme"
      aria-labelledby="design-tab-readme"
      className="ui-card overflow-hidden"
    >
      <div className="ui-card-header flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ui-icon-badge w-9 h-9">
            <FileText aria-hidden="true" className="w-4 h-4" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-on-primary-container">
            {t("c4.designDoc")}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setReadmeMode((mode) => (mode === "reading" ? "source" : "reading"))}
          className="ui-btn-outlined bg-surface border-primary-outline text-primary hover:bg-primary-container hover:text-on-primary-container"
        >
          {readmeMode === "reading" ? (
            <Code2 aria-hidden="true" className="w-3.5 h-3.5" />
          ) : (
            <Eye aria-hidden="true" className="w-3.5 h-3.5" />
          )}
          <span>{t(readmeMode === "reading" ? "c4.readmeSource" : "c4.readmeReading")}</span>
        </button>
      </div>
      <div className="p-5 sm:p-6">
        {readmeMode === "source" ? (
          <textarea
            aria-label={t("c4.designDoc")}
            rows={22}
            className="ui-input font-mono"
            value={designDoc}
            onChange={(event) => onChangeDesignDoc(event.target.value)}
          />
        ) : (
          <article className="ui-markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{designDoc}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}
