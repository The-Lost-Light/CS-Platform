import { useI18n } from '../../i18n';
import type { MindMapNode, Analysis } from '../../types';
import React, { useState } from 'react';
import {
  Network,
  Plus,
  Trash2,
  FileText,
  FolderTree,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Move,
  Edit3,
} from 'lucide-react';

const CATEGORY_STYLES: Record<string, { label: string; bg: string; border: string; text: string; stroke: string }> = {
  root: {
    label: '核心入口 (Root)',
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-400',
    text: 'text-[#041E49]',
    stroke: '#818cf8',
  },
  frontend: {
    label: '前端模組 (Frontend)',
    bg: 'bg-sky-500/20',
    border: 'border-sky-400',
    text: 'text-sky-200',
    stroke: '#38bdf8',
  },
  backend: {
    label: '後端服務 (Backend)',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-400',
    text: 'text-[#0D652D]',
    stroke: '#34d399',
  },
  database: {
    label: '資料與文件 (DB / Docs)',
    bg: 'bg-amber-500/20',
    border: 'border-amber-400',
    text: 'text-[#B06000]',
    stroke: '#fbbf24',
  },
  ai: {
    label: '智慧/演算法 (AI/Core)',
    bg: 'bg-purple-500/20',
    border: 'border-purple-400',
    text: 'text-purple-200',
    stroke: '#c084fc',
  },
  testing: {
    label: '自動化測試 (Testing)',
    bg: 'bg-rose-500/20',
    border: 'border-rose-400',
    text: 'text-[#B3261E]',
    stroke: '#fb7185',
  },
};

export function MindMapArchitect({
  nodes = [],
  onChangeNodes,
  designDoc = '',
  onChangeDesignDoc,
  nodeEvaluations = [],
}: { nodes?: MindMapNode[]; onChangeNodes: (nodes: MindMapNode[]) => void; designDoc?: string; onChangeDesignDoc: (doc: string) => void; nodeEvaluations?: Analysis['nodeEvaluations'] }) {
  const { t, locale } = useI18n();
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id || null);
  const [newNodeForm, setNewNodeForm] = useState({
    label: '',
    category: 'frontend',
    expectedPath: '',
    description: '',
    parentId: nodes[0]?.id || '',
  });

  const evalById = new Map(nodeEvaluations.map((e) => [e.id, e]));
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;

  const handleUpdateSelectedNode = <K extends keyof MindMapNode,>(field: K, value: MindMapNode[K]) => {
    if (!selectedNode) return;
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, [field]: value } : n
    );
    onChangeNodes(updated);
  };

  const handleAddNode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newNodeForm.label.trim()) return;

    const parent = nodes.find((n) => n.id === newNodeForm.parentId) || nodes[0];
    const siblingCount = nodes.filter((n) => n.parentId === (parent?.id || null)).length;

    const newNode = {
      id: `node-${Date.now()}`,
      label: newNodeForm.label.trim(),
      category: newNodeForm.category,
      expectedPath: newNodeForm.expectedPath.trim() || 'src/NewModule.tsx',
      description: newNodeForm.description.trim() || t("自訂新增的專案架構模組節點"),
      parentId: parent ? parent.id : null,
      x: Math.min(680, Math.max(80, (parent?.x || 360) + (siblingCount % 2 === 0 ? -150 : 150))),
      y: Math.min(370, (parent?.y || 60) + 125),
    };

    onChangeNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    setNewNodeForm({
      label: '',
      category: 'frontend',
      expectedPath: '',
      description: '',
      parentId: parent ? parent.id : '',
    });
  };

  const handleDeleteNode = (idToRemove: string) => {
    if (nodes.length <= 1) return;
    const filtered = nodes.filter((n) => n.id !== idToRemove && n.parentId !== idToRemove);
    onChangeNodes(filtered);
    if (selectedNodeId === idToRemove) {
      setSelectedNodeId(filtered[0]?.id || null);
    }
  };

  const nudgeNodePosition = (dx: number, dy: number) => {
    if (!selectedNode) return;
    const nextX = Math.max(70, Math.min(730, (selectedNode.x || 300) + dx));
    const nextY = Math.max(40, Math.min(380, (selectedNode.y || 150) + dy));
    handleUpdateSelectedNode('x', nextX);
    const updated = nodes.map((n) =>
      n.id === selectedNode.id ? { ...n, x: nextX, y: nextY } : n
    );
    onChangeNodes(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Grid: Left = Interactive Mind Map Canvas (7 cols), Right = Node Inspector & Add Node Form (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Interactive SVG Mind Map Canvas */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="px-4 py-3 bg-[#F0F4F9] dark:bg-[#282A2F] border-b border-slate-200 dark:border-[#33353A] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-[#6750A4]" />
              <h3 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("互動式專案架構心智圖 (Project Architecture Mind Map)")}</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#444746] dark:text-[#C4C7C5]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />{t(" 已實作對應檔案")}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />{t(" 路徑偏移")}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />{t(" 尚未建立檔案")}</span>
            </div>
          </div>

          {/* Mind Map SVG Viewport */}
          <div className="relative bg-[#F8FAFD] dark:bg-[#121316] overflow-x-auto p-2">
            <svg
              viewBox="0 0 800 430"
              className="w-full h-[410px] min-w-[640px] select-none"
            >
              <defs>
                <pattern
                  id="mindmap-grid"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1" fill="rgba(11, 87, 208, 0.18)" />
                </pattern>
              </defs>
              <rect width="800" height="430" fill="url(#mindmap-grid)" />

              {/* Parent -> Child Curved Links */}
              {nodes.map((node) => {
                if (!node.parentId) return null;
                const parent = nodes.find((p) => p.id === node.parentId);
                if (!parent) return null;
                const style = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.frontend;
                const midY = (parent.y + node.y) / 2;
                return (
                  <path
                    key={`edge-${parent.id}-${node.id}`}
                    d={`M ${parent.x} ${parent.y + 22} C ${parent.x} ${midY}, ${node.x} ${midY}, ${node.x} ${node.y - 24}`}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth="2.2"
                    strokeOpacity="0.65"
                  />
                );
              })}

              {/* Mind Map Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const evalInfo = evalById.get(node.id);
                const status = evalInfo?.status || 'unmapped';
                const catStyle = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.frontend;

                const statusDotColor =
                  status === 'implemented'
                    ? '#10b981'
                    : status === 'partial'
                    ? '#f59e0b'
                    : '#f43f5e';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer transition-transform"
                  >
                    <title>{node.label}</title>
                    {/* Selection Halo */}
                    {isSelected && (
                      <rect
                        x="-98"
                        y="-32"
                        width="196"
                        height="64"
                        rx="14"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Node Card Box */}
                    <rect
                      x="-92"
                      y="-26"
                      width="184"
                      height="52"
                      rx="11"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#c084fc' : catStyle.stroke}
                      strokeWidth={isSelected ? '2.2' : '1.5'}
                    />

                    {/* Repo Match Status Dot */}
                    <circle
                      cx="76"
                      cy="-12"
                      r="5"
                      fill={statusDotColor}
                    />

                    {/* Node Title */}
                    <text
                      x="-78"
                      y="-6"
                      fill="#1F1F1F"
                      fontSize="11.5"
                      fontWeight="700"
                    >
                      {node.label.length > (locale === 'en' ? 25 : 14) ? node.label.slice(0, locale === 'en' ? 25 : 14) + '…' : node.label}
                    </text>

                    {/* Expected File Path */}
                    <text
                      x="-78"
                      y="13"
                      fill="#444746"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {node.expectedPath.length > 23
                        ? '…' + node.expectedPath.slice(-22)
                        : node.expectedPath}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Column: Selected Node Editor + Add New Mind-Map Node */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Node Editor Card */}
          {selectedNode && (
            <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#33353A] pb-2.5">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#6750A4]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#303030] dark:text-[#C4C7C5]">{t("編輯選取的心智圖節點")}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => nudgeNodePosition(-25, 0)}
                    className="px-2 py-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-slate-700 text-[11px] text-[#303030] dark:text-[#C4C7C5]"
                    title={t("左移節點")}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeNodePosition(25, 0)}
                    className="px-2 py-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-slate-700 text-[11px] text-[#303030] dark:text-[#C4C7C5]"
                    title={t("右移節點")}
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeNodePosition(0, -20)}
                    className="px-2 py-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-slate-700 text-[11px] text-[#303030] dark:text-[#C4C7C5]"
                    title={t("上移節點")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeNodePosition(0, 20)}
                    className="px-2 py-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-slate-700 text-[11px] text-[#303030] dark:text-[#C4C7C5]"
                    title={t("下移節點")}
                  >
                    ↓
                  </button>
                  {selectedNode.parentId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      className="ml-1 p-1 rounded bg-[#FAD2CF] hover:bg-[#F28B82]/50 text-[#B3261E]"
                      title={t("刪除此節點")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-[#444746] dark:text-[#C4C7C5] mb-1">{t("模組名稱")}</label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    aria-label={t('模組名稱')}
                    onChange={(e) => handleUpdateSelectedNode('label', e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#1F1F1F] dark:text-[#E3E2E6] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#444746] dark:text-[#C4C7C5] mb-1">{t("架構分層類別")}</label>
                  <select
                    value={selectedNode.category}
                    aria-label={t('架構分層類別')}
                    onChange={(e) => handleUpdateSelectedNode('category', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#1F1F1F] dark:text-[#E3E2E6] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Object.entries(CATEGORY_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {t(v.label)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[11px] text-[#444746] dark:text-[#C4C7C5] mb-1">{t("預期對應 GitHub 檔案或資料夾路徑 (用於自動比對檔案結構)")}</label>
                <input
                  type="text"
                  value={selectedNode.expectedPath}
                  onChange={(e) => handleUpdateSelectedNode('expectedPath', e.target.value)}
                  placeholder={t("例如: src/components/CodeEditor.tsx 或 tests/")}
                  className="w-full px-3 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#0B57D0] font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="text-xs">
                <label className="block text-[11px] text-[#444746] dark:text-[#C4C7C5] mb-1">{t("模組職責說明")}</label>
                <input
                  type="text"
                  value={selectedNode.description || ''}
                  aria-label={t('模組職責說明')}
                  onChange={(e) => handleUpdateSelectedNode('description', e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#303030] dark:text-[#C4C7C5] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Add New Mind Map Node Form */}
          <form
            onSubmit={handleAddNode}
            className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D652D]">
              <Plus className="w-4 h-4" />
              <span>{t("新增心智圖架構節點")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <input
                type="text"
                value={newNodeForm.label}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, label: e.target.value })}
                placeholder={t("新模組名稱 (例: JWT 權限驗證)")}
                className="px-3 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#1F1F1F] dark:text-[#E3E2E6] placeholder-slate-500"
              />
              <input
                type="text"
                value={newNodeForm.expectedPath}
                onChange={(e) =>
                  setNewNodeForm({ ...newNodeForm, expectedPath: e.target.value })
                }
                placeholder={t("預期檔案路徑 (例: server/auth.ts)")}
                className="px-3 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#0B57D0] font-mono placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <select
                value={newNodeForm.category}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, category: e.target.value })}
                className="px-2.5 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#1F1F1F] dark:text-[#E3E2E6]"
              >
                {Object.entries(CATEGORY_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {t(v.label)}
                  </option>
                ))}
              </select>

              <select
                value={newNodeForm.parentId}
                onChange={(e) => setNewNodeForm({ ...newNodeForm, parentId: e.target.value })}
                className="px-2.5 py-1.5 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-lg text-[#1F1F1F] dark:text-[#E3E2E6]"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>{t("父節點：")}{n.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-[#6750A4] hover:bg-[#4F378B] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("加入心智圖並即時比對 GitHub 結構")}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Section: Written Project Architecture Specification Editor */}
      <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0B57D0]" />
            <h3 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("專案架構設計與開發計畫書 (Written Architecture & Milestone Plan)")}</h3>
          </div>
          <span className="text-xs text-[#444746] dark:text-[#C4C7C5]">{t("支援以反引號 ")}<code className="text-[#0B57D0]">`src/path/file.ts`</code>{t(" 標記預期路徑，系統將自動核對是否存在於 GitHub 倉庫")}</span>
        </div>

        <textarea
          value={designDoc}
          aria-label={t('專案架構設計與開發計畫書 (Written Architecture & Milestone Plan)')}
          onChange={(e) => onChangeDesignDoc(e.target.value)}
          rows={8}
          className="w-full p-4 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-200 dark:border-[#33353A] font-mono text-xs text-[#1F1F1F] dark:text-[#E3E2E6] leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t("在此撰寫您的專案系統架構設計、目錄規劃與里程碑...")}
        />
      </div>
    </div>
  );
}
