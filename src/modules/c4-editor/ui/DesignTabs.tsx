import { useI18n } from "@modules/i18n";
import { SegmentedControl } from "@shared/ui";
import { FileText, Network } from "lucide-react";

import type { DesignTab } from "../model/types";

export function DesignTabs({
  designTab,
  onChangeDesignTab,
  history = false,
}: {
  designTab: DesignTab;
  onChangeDesignTab: (tab: DesignTab) => void;
  history?: boolean;
}) {
  const { t } = useI18n();
  return (
    <SegmentedControl
      role="tablist"
      ariaLabel={t("workspace.tabs.design")}
      value={designTab}
      onChange={onChangeDesignTab}
      className="shrink-0"
      itemClassName="px-4"
      options={[
        {
          value: "readme",
          label: "README.md",
          icon: FileText,
          id: "design-tab-readme",
          ariaControls: history ? "design-history-panel" : "design-panel-readme",
        },
        {
          value: "diagram",
          label: "C4 Model",
          icon: Network,
          id: "design-tab-diagram",
          ariaControls: history ? "design-history-panel" : "design-panel-diagram",
        },
      ]}
    />
  );
}
