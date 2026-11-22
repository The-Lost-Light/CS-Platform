import { useI18n } from "@modules/i18n";
import { Button, Chip, cn } from "@shared/ui";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { useRef } from "react";

import type { C4ModelFile } from "../hooks/useC4ModelFile";

export function C4FileActions({
  file,
  readOnly = false,
}: {
  file: Pick<C4ModelFile, "importing" | "fileStatus" | "exportModel" | "importModel">;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const { importing, fileStatus, exportModel, importModel } = file;
  const isSuccess = fileStatus === "importSuccess";

  return (
    <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
      {fileStatus && (
        <Chip
          variant={isSuccess ? "success" : "danger"}
          icon={isSuccess ? CheckCircle2 : AlertCircle}
          role={isSuccess ? "status" : "alert"}
          className={cn(
            "max-w-full sm:max-w-sm px-3.5 py-1.5 border transition-colors",
            isSuccess ? "border-success-outline" : "border-danger-outline",
          )}
        >
          <span>{t(`c4.${fileStatus}`)}</span>
        </Chip>
      )}
      {!readOnly && (
        <Button
          variant="tonal"
          size="sm"
          icon={Upload}
          disabled={importing}
          title={t("c4.fileHelp")}
          onClick={() => fileInput.current?.click()}
          className="border border-primary-outline/70"
        >
          <span>{t(importing ? "c4.importing" : "c4.importModel")}</span>
        </Button>
      )}
      <Button
        variant="tonal"
        size="sm"
        icon={Download}
        disabled={importing}
        onClick={exportModel}
        className="border border-primary-outline/70"
      >
        <span>{t("c4.exportModel")}</span>
      </Button>
      {!readOnly && (
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label={t("c4.importModel")}
          className="hidden"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            event.target.value = "";
            if (selectedFile) void importModel(selectedFile);
          }}
        />
      )}
    </div>
  );
}
