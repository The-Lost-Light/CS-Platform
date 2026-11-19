import { useI18n } from "@modules/i18n";
import { FileText, Network } from "lucide-react";

import type { DesignTab } from "../model/types";

export function DesignTabs({
  designTab,
  onChangeDesignTab,
}: {
  designTab: DesignTab;
  onChangeDesignTab: (tab: DesignTab) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="ui-pill-group" role="tablist" aria-label={t("workspace.tabs.design")}>
      <button
        type="button"
        role="tab"
        id="design-tab-readme"
        aria-controls="design-panel-readme"
        aria-selected={designTab === "readme"}
        onClick={() => onChangeDesignTab("readme")}
        className={`ui-pill-item px-4 ${
          designTab === "readme" ? "ui-pill-item-active" : "ui-pill-item-idle"
        }`}
      >
        <FileText aria-hidden="true" className="w-3.5 h-3.5" />
        <span>README.md</span>
      </button>
      <button
        type="button"
        role="tab"
        id="design-tab-diagram"
        aria-controls="design-panel-diagram"
        aria-selected={designTab === "diagram"}
        onClick={() => onChangeDesignTab("diagram")}
        className={`ui-pill-item px-4 ${
          designTab === "diagram" ? "ui-pill-item-active" : "ui-pill-item-idle"
        }`}
      >
        <Network aria-hidden="true" className="w-3.5 h-3.5" />
        <span>C4 Model</span>
      </button>
    </div>
  );
}
