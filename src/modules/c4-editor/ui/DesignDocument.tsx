import { useI18n } from "@modules/i18n";
import { Button, Card, CardHeader, EmptyState, TextArea } from "@shared/ui";
import { MAX_DESIGN_DOC_LENGTH } from "@shared/workspacePolicy";
import { Code2, Eye, FileText } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DesignDocument({
  designDoc,
  onChangeDesignDoc,
  readmeMode,
  setReadmeMode,
  readOnly = false,
  emptyReadOnlyMessage,
}: {
  designDoc: string;
  onChangeDesignDoc: (doc: string) => void;
  readmeMode: "reading" | "source";
  setReadmeMode: Dispatch<SetStateAction<"reading" | "source">>;
  readOnly?: boolean;
  emptyReadOnlyMessage?: string;
}) {
  const { t } = useI18n();
  return (
    <Card
      as="div"
      overflowHidden
      role="tabpanel"
      id="design-panel-readme"
      aria-labelledby="design-tab-readme"
    >
      <CardHeader
        icon={FileText}
        headingAs="h4"
        truncateTitle={false}
        title={t("c4.designDoc")}
        titleClassName="text-sm sm:text-base"
        layoutClassName="flex flex-wrap items-center justify-between gap-3"
        actions={
          <Button
            variant="outlined"
            icon={readmeMode === "reading" ? Code2 : Eye}
            iconClassName="w-3.5 h-3.5"
            onClick={() => setReadmeMode((mode) => (mode === "reading" ? "source" : "reading"))}
            className="bg-surface border-primary-outline text-primary hover:bg-primary-container hover:text-on-primary-container"
          >
            <span>{t(readmeMode === "reading" ? "c4.readmeSource" : "c4.readmeReading")}</span>
          </Button>
        }
      />
      <div className="p-5 sm:p-6">
        {readmeMode === "source" ? (
          <TextArea
            aria-label={t("c4.designDoc")}
            rows={22}
            readOnly={readOnly}
            mono
            maxLength={MAX_DESIGN_DOC_LENGTH}
            value={designDoc}
            onChange={(event) => {
              if (!readOnly) onChangeDesignDoc(event.target.value.slice(0, MAX_DESIGN_DOC_LENGTH));
            }}
          />
        ) : readOnly && !designDoc.trim() ? (
          <EmptyState>{emptyReadOnlyMessage ?? t("workspace.studentNoReadme")}</EmptyState>
        ) : (
          <article className="ui-markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{designDoc}</Markdown>
          </article>
        )}
      </div>
    </Card>
  );
}
