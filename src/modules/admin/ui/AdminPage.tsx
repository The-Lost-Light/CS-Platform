import { useI18n } from "@modules/i18n";
import { IconLink, PageContainer, PageHeaderCard, SegmentedControl } from "@shared/ui";
import { FolderGit2, ShieldCheck, Users, X } from "lucide-react";
import { useRef, useState } from "react";

import { AccountList } from "./AccountList";
import type { ManagementListHandle } from "./ManagementListHandle";
import { ProjectList } from "./ProjectList";

export default function AdminPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"projects" | "accounts">("projects");
  const projects = useRef<ManagementListHandle>(null);
  const accounts = useRef<ManagementListHandle>(null);

  function showList(section: typeof tab) {
    const list = section === "projects" ? projects : accounts;
    list.current?.showList();
    setTab(section);
  }
  return (
    <PageContainer as="section">
      <PageHeaderCard
        as="div"
        icon={ShieldCheck}
        title={t("admin.mode")}
        description={t("admin.description")}
        actionsClassName="self-start sm:self-auto"
        actions={
          <>
            <SegmentedControl
              ariaLabel={t("admin.mode")}
              value={tab}
              onChange={showList}
              itemClassName="px-4 py-2"
              options={[
                { value: "projects", label: t("admin.projects.title"), icon: FolderGit2 },
                { value: "accounts", label: t("admin.title"), icon: Users },
              ]}
            />
            <IconLink href="/" icon={X} label={t("common.backHome")} withTitle />
          </>
        }
      />
      <div hidden={tab !== "projects"}>
        <ProjectList ref={projects} />
      </div>
      <div hidden={tab !== "accounts"}>
        <AccountList ref={accounts} />
      </div>
    </PageContainer>
  );
}
