import {
  AvatarBadge,
  Button,
  Card,
  CardHeader,
  Chip,
  DataTable,
  EmptyState,
  FeedbackBanner,
  FormField,
  IconBadge,
  IconButton,
  LoadingPanel,
  Menu,
  MenuItem,
  PageContainer,
  PageHeaderCard,
  Panel,
  SegmentedControl,
  SelectField,
  TextArea,
  TextInput,
  Tooltip,
  cn,
} from "@shared/ui";
import { Check, FolderGit2, Plus, Search, X } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { assert, test } from "vite-plus/test";

test("cn joins truthy class tokens cleanly", () => {
  assert.strictEqual(cn("a", false, null, undefined, "b"), "a b");
  assert.strictEqual(cn(false, null), "");
});

test("Button and IconButton apply variants, sizes, icons, and accessibility labels", () => {
  const buttonHtml = renderToStaticMarkup(
    <Button variant="tonal" size="sm" icon={Plus} trailingIcon={Check} loading>
      Save
    </Button>,
  );
  assert.match(buttonHtml, /^<button type="button" class="ui-btn-tonal px-3 py-1\.5 text-xs">/);
  assert.ok(buttonHtml.includes("animate-spin"));
  assert.ok(buttonHtml.includes(">Save<"));

  const loadingOnlyHtml = renderToStaticMarkup(<Button loading>Saving</Button>);
  assert.ok(loadingOnlyHtml.includes("animate-spin"));

  const iconBtnHtml = renderToStaticMarkup(
    <IconButton icon={X} label="Close" withTitle variant="surface" size="sm" />,
  );
  assert.match(iconBtnHtml, /aria-label="Close"/);
  assert.match(iconBtnHtml, /title="Close"/);
  assert.ok(iconBtnHtml.includes("ui-btn-icon"));
  assert.ok(iconBtnHtml.includes("w-7 h-7"));
});

test("Badge components render IconBadge, Chip variants, and AvatarBadge fallback", () => {
  const iconBadgeHtml = renderToStaticMarkup(
    <IconBadge icon={FolderGit2} tone="warning" size="lg" as="span" />,
  );
  assert.match(iconBadgeHtml, /^<span class="ui-icon-badge-warning w-11 h-11 rounded-xl">/);

  const chipHtml = renderToStaticMarkup(
    <Chip variant="code" size="sm" mono>
      CS-101
    </Chip>,
  );
  assert.match(chipHtml, /^<span class="ui-code-badge px-2 py-0\.5 text-\[11px\] font-mono">/);
  assert.ok(chipHtml.includes("CS-101"));

  const avatarFallback = renderToStaticMarkup(<AvatarBadge name="" size="sm" />);
  assert.ok(avatarFallback.includes(">?<"));
  const avatarNamed = renderToStaticMarkup(<AvatarBadge name="Ada" size="md" />);
  assert.ok(avatarNamed.includes(">A<"));
  assert.ok(avatarNamed.includes("w-8 h-8"));
});

test("Card, CardHeader, PageContainer, PageHeaderCard, Panel, and EmptyState compose layouts", () => {
  const pageHtml = renderToStaticMarkup(
    <PageContainer variant="workspace">
      <PageHeaderCard
        compact
        icon={FolderGit2}
        title="Workspace"
        description="Overview"
        actions={<Button>Action</Button>}
      >
        <div data-testid="toolbar">Toolbar</div>
      </PageHeaderCard>
      <Card overflowHidden padded>
        <CardHeader as="header" icon={FolderGit2} title="Section" headingAs="h3" />
        <Panel>Item</Panel>
        <EmptyState>Nothing here</EmptyState>
      </Card>
    </PageContainer>,
  );
  assert.ok(pageHtml.includes("ui-workspace-shell"));
  assert.ok(pageHtml.includes("Overview"));
  assert.ok(pageHtml.includes("Toolbar"));
  assert.ok(pageHtml.includes("ui-card overflow-hidden p-5 sm:p-6"));
  assert.ok(pageHtml.includes('<header class="ui-card-header'));
  assert.ok(pageHtml.includes("<h3"));
  assert.ok(pageHtml.includes("ui-panel"));
  assert.ok(pageHtml.includes("ui-empty"));
});

test("FormField, TextInput, TextArea, and SelectField support inline and external help", () => {
  const inlineHtml = renderToStaticMarkup(
    <FormField label="Search" help="Type to filter" helpId="search-help">
      <TextInput icon={Search} mono compact trailing={<span>⌘K</span>} />
    </FormField>,
  );
  assert.ok(
    inlineHtml.includes('<span id="search-help" class="ui-field-help">Type to filter</span>'),
  );
  assert.ok(inlineHtml.includes("pl-10"));
  assert.ok(inlineHtml.includes("pr-11"));
  assert.ok(inlineHtml.includes("px-3 py-2"));
  assert.ok(inlineHtml.includes("font-mono"));
  assert.ok(inlineHtml.includes("⌘K"));

  const externalHtml = renderToStaticMarkup(
    <FormField label="Bio" help="Max 200 chars" helpId="bio-help" externalHelp>
      <TextArea compact mono />
    </FormField>,
  );
  assert.ok(
    externalHtml.includes('</label><p id="bio-help" class="ui-field-help">Max 200 chars</p>'),
  );

  const selectHtml = renderToStaticMarkup(
    <FormField label="Role">
      <SelectField defaultValue="user">
        <option value="user">Student</option>
      </SelectField>
    </FormField>,
  );
  assert.ok(selectHtml.includes('class="ui-input"'));
});

test("SegmentedControl, Tooltip, DataTable, Menu, FeedbackBanner, and LoadingPanel render semantics", () => {
  const tabsHtml = renderToStaticMarkup(
    <SegmentedControl
      role="tablist"
      ariaLabel="Modes"
      value="a"
      onChange={() => {}}
      options={[
        { value: "a", label: "Tab A", id: "tab-a", ariaControls: "panel-a" },
        { value: "b", label: "Tab B", id: "tab-b", ariaControls: "panel-b" },
      ]}
    />,
  );
  assert.ok(tabsHtml.includes('role="tablist"'));
  assert.ok(tabsHtml.includes('role="tab"'));
  assert.ok(tabsHtml.includes('aria-selected="true"'));
  assert.ok(tabsHtml.includes('aria-selected="false"'));

  const pressedHtml = renderToStaticMarkup(
    <SegmentedControl
      size="sm"
      value="unified"
      onChange={() => {}}
      options={[
        { value: "unified", label: "Unified" },
        { value: "split", label: "Split" },
      ]}
    />,
  );
  assert.ok(pressedHtml.includes('aria-pressed="true"'));
  assert.ok(pressedHtml.includes('aria-pressed="false"'));

  const tooltipWithRole = renderToStaticMarkup(
    <Tooltip label="Hint">
      <button type="button">?</button>
    </Tooltip>,
  );
  assert.match(tooltipWithRole, /role="tooltip"[^>]*>Hint<\/span>/);

  const tooltipWithoutRole = renderToStaticMarkup(
    <Tooltip as="div" role={null} tone="danger" align="responsive-start" label="Error hint">
      <span>!</span>
    </Tooltip>,
  );
  assert.ok(!tooltipWithoutRole.includes("role="));
  assert.ok(tooltipWithoutRole.includes("border-danger-outline"));

  const emptyTable = renderToStaticMarkup(
    <DataTable headers={["Col"]} isEmpty emptyMessage="Empty">
      {null}
    </DataTable>,
  );
  assert.ok(emptyTable.includes('class="ui-empty"'));
  assert.ok(!emptyTable.includes("<table"));

  const populatedTable = renderToStaticMarkup(
    <DataTable headers={["Name"]} isEmpty={false} emptyMessage="Empty">
      <tr>
        <td>Alice</td>
      </tr>
    </DataTable>,
  );
  assert.ok(populatedTable.includes("<th>Name</th>"));
  assert.ok(populatedTable.includes("<td>Alice</td>"));

  const menuHtml = renderToStaticMarkup(
    <Menu>
      <MenuItem role="menuitemradio" selected>
        Main
      </MenuItem>
      <MenuItem tone="danger">Delete</MenuItem>
    </Menu>,
  );
  assert.ok(menuHtml.includes('role="menu"'));
  assert.ok(menuHtml.includes('role="menuitemradio"'));
  assert.ok(menuHtml.includes('aria-checked="true"'));
  assert.ok(menuHtml.includes("ui-menu-item-active"));
  assert.ok(menuHtml.includes("ui-menu-item-danger"));

  const bannerHtml = renderToStaticMarkup(
    <FeedbackBanner kind="success" action={<Button size="sm">Undo</Button>}>
      <span>Saved</span>
    </FeedbackBanner>,
  );
  assert.ok(bannerHtml.includes('role="status"'));
  assert.ok(bannerHtml.includes("Saved"));
  assert.ok(bannerHtml.includes("Undo"));

  const loadingHtml = renderToStaticMarkup(<LoadingPanel label="Loading..." />);
  assert.ok(loadingHtml.includes('role="status"'));
  assert.ok(loadingHtml.includes("Loading..."));
});
