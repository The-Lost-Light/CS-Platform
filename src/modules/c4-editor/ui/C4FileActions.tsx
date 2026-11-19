import { useI18n } from "@modules/i18n";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { useRef } from "react";

import type { C4ModelFile } from "../hooks/useC4ModelFile";

export function C4FileActions({
  file,
}: {
  file: Pick<C4ModelFile, "importing" | "fileStatus" | "exportModel" | "importModel">;
}) {
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const { importing, fileStatus, exportModel, importModel } = file;

  return (
    <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
      {fileStatus && (
        <div
          role={fileStatus === "importSuccess" ? "status" : "alert"}
          className={`inline-flex items-center gap-1.5 max-w-full sm:max-w-sm px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            fileStatus === "importSuccess"
              ? "bg-success-container border-success-outline text-on-success-container"
              : "bg-danger-container border-danger-outline text-on-danger-container"
          }`}
        >
          {fileStatus === "importSuccess" ? (
            <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{t(`c4.${fileStatus}`)}</span>
        </div>
      )}
      <button
        type="button"
        disabled={importing}
        title={t("c4.fileHelp")}
        onClick={() => fileInput.current?.click()}
        className="ui-btn-tonal border border-primary-outline/70 px-3 py-1.5 text-xs"
      >
        <Upload aria-hidden="true" className="w-3.5 h-3.5" />
        <span>{t(importing ? "c4.importing" : "c4.importModel")}</span>
      </button>
      <button
        type="button"
        disabled={importing}
        onClick={exportModel}
        className="ui-btn-tonal border border-primary-outline/70 px-3 py-1.5 text-xs"
      >
        <Download aria-hidden="true" className="w-3.5 h-3.5" />
        <span>{t("c4.exportModel")}</span>
      </button>
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
    </div>
  );
}
