import { useI18n } from "@modules/i18n";
import { SegmentedControl } from "@shared/ui";
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
          ariaControls: "design-panel-readme",
        },
        {
          value: "diagram",
          label: "C4 Model",
          icon: Network,
          id: "design-tab-diagram",
          ariaControls: "design-panel-diagram",
        },
      ]}
    />
  );
}
