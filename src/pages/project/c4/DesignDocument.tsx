import { Code2, Eye, FileText } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@i18n";
const fieldClass = "ui-input px-3 py-2";

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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-on-primary-container">
            {t("c4.designDoc")}
          </h4>
        </div>
        <button
          type="button"
          onClick={() =>
            setReadmeMode((mode) => (mode === "reading" ? "source" : "reading"))
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-surface hover:bg-primary-container text-primary hover:text-on-primary-container border border-primary-outline px-3.5 py-1.5 text-xs font-bold shadow-2xs transition"
        >
          {readmeMode === "reading" ? (
            <Code2 className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          <span>
            {t(
              readmeMode === "reading" ? "c4.readmeSource" : "c4.readmeReading",
            )}
          </span>
        </button>
      </div>

      <div className="p-6">
        {readmeMode === "source" ? (
          <textarea
            aria-label={t("c4.designDoc")}
            rows={22}
            className={`${fieldClass} font-mono`}
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
