import { useEffect, useRef, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReactFlow, applyNodeChanges, Background, Controls, MiniMap, Handle, Position, MarkerType, type Node, type NodeProps, type ReactFlowProps } from '@xyflow/react';
import {
  FileText,
  Network,
  Plus,
  Upload,
  Download,
  HelpCircle,
  Eye,
  Code2,
  Trash2,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { removeC4Nodes, c4Drilldown, createC4NodeInScope, type C4Kind, type C4Node, type C4Relationship } from '../../utils/c4Model';
import { C4_FILE_MAX_BYTES, parseC4File, serializeC4File } from '../../utils/c4File';

const colors = { expandable: '#0B57D0', leaf: '#6750A4' };
type FlowNode = Node<{ title: string; kind: C4Kind; description: string; technology: string; status: string; expandable: boolean; onSelect: () => void; onExplore: () => void }, 'c4'>;

function C4Card({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={data.title}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Enter' && event.shiftKey) data.onExplore();
          else data.onSelect();
        }
      }}
      style={{ width: 280, minHeight: 230 }}
      className={`rounded-2xl border-2 p-4 shadow-xs transition-all flex flex-col justify-between ${
        data.expandable
          ? 'bg-white dark:bg-[#1E1F23] border-[#0B57D0] dark:border-[#A8C7FA] text-[#1F1F1F] dark:text-[#E3E2E6]'
          : 'bg-[#F8FAFD] dark:bg-[#121316] border-[#6750A4]/60 dark:border-[#D0BCFF]/60 text-[#1F1F1F] dark:text-[#E3E2E6]'
      } ${
        selected
          ? 'ring-4 ring-[#6750A4]/30 dark:ring-[#D0BCFF]/35 border-[#6750A4] dark:border-[#D0BCFF] shadow-md'
          : 'hover:shadow-md'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#0B57D0] dark:!bg-[#A8C7FA] !border-2 !border-white dark:!border-[#1E1F23]"
      />
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
              data.expandable
                ? 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF]'
                : 'bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF]'
            }`}
          >
            {data.kind}
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              data.expandable ? 'bg-[#0B57D0] dark:bg-[#A8C7FA]' : 'bg-[#6750A4] dark:bg-[#D0BCFF]'
            }`}
          />
        </div>
        <div className="mt-2 text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6] break-words">
          {data.title}
        </div>
        {data.technology && (
          <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-[#F0F4F9] dark:bg-[#282A2F] text-[11px] font-mono text-[#6750A4] dark:text-[#D0BCFF] break-words">
            [{data.technology}]
          </div>
        )}
        <p className="mt-2 text-xs text-[#444746] dark:text-[#C4C7C5] break-words whitespace-pre-wrap leading-relaxed">
          {data.description}
        </p>
      </div>
      {data.status && (
        <p className="mt-3 border-t border-slate-200 dark:border-[#33353A] pt-2 text-[11px] font-mono text-[#0B57D0] dark:text-[#A8C7FA] break-words">
          {data.status}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#6750A4] dark:!bg-[#D0BCFF] !border-2 !border-white dark:!border-[#1E1F23]"
      />
    </div>
  );
}

const nodeTypes = { c4: C4Card };
type CanvasNode = FlowNode;

/** Keep measurements and live drag positions in React Flow; persist only completed moves. */
function C4Canvas({ nodes = [], onNodesChange, ...props }: ReactFlowProps<CanvasNode>) {
  const [canvasNodes, setCanvasNodes] = useState(nodes);
  useEffect(() => {
    setCanvasNodes(previous => nodes.map(node => ({ ...previous.find(item => item.id === node.id), ...node })));
  }, [nodes]);
  return <ReactFlow<CanvasNode> {...props} nodes={canvasNodes} onNodesChange={changes => {
    setCanvasNodes(previous => applyNodeChanges(changes, previous));
    const completedMoves = changes.filter(change => change.type === 'position' && change.position && change.dragging !== true);
    if (completedMoves.length) onNodesChange?.(completedMoves);
  }} />;
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 dark:border-[#33353A] bg-[#F8FAFD] dark:bg-[#121316] px-3 py-2 text-xs sm:text-sm text-[#1F1F1F] dark:text-[#E3E2E6] placeholder-[#5E5E5E] dark:placeholder-[#8E918F] focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA] transition';
const panelClass =
  'rounded-[24px] border border-slate-200/90 dark:border-[#33353A] bg-white dark:bg-[#1E1F23] p-5 shadow-xs space-y-4 transition-colors';

export function C4Architect({ nodes, onChangeNodes, relationships, onChangeRelationships, designDoc, onChangeDesignDoc }: {
  nodes: C4Node[]; onChangeNodes: (nodes: C4Node[]) => void;
  relationships: C4Relationship[]; onChangeRelationships: (edges: C4Relationship[]) => void;
  designDoc: string; onChangeDesignDoc: (doc: string) => void;
}) {
  const { t } = useI18n();
  const [designTab, setDesignTab] = useState<'readme' | 'diagram'>('readme');
  const [readmeMode, setReadmeMode] = useState<'reading' | 'source'>('reading');
  const [scopeId, setScopeId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [edgeId, setEdgeId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [fileStatus, setFileStatus] = useState<'importSuccess' | 'importError' | 'fileTooLarge' | 'exportError' | null>(null);
  const [importRevision, setImportRevision] = useState(0);

  const exportModel = () => {
    try {
      const url = URL.createObjectURL(new Blob([serializeC4File(nodes, relationships)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'c4-model.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFileStatus(null);
    } catch { setFileStatus('exportError'); }
  };

  const importModel = async (file: File) => {
    setFileStatus(null);
    if (file.size > C4_FILE_MAX_BYTES) { setFileStatus('fileTooLarge'); return; }
    setImporting(true);
    try {
      const model = parseC4File(await file.text());
      onChangeNodes(model.nodes);
      onChangeRelationships(model.relationships);
      setScopeId(''); setSelectedId(''); setEdgeId('');
      setImportRevision(value => value + 1);
      setDesignTab('diagram');
      setFileStatus('importSuccess');
    } catch { setFileStatus('importError'); }
    finally { setImporting(false); }
  };

  const { scope, path, inside, visible } = c4Drilldown(nodes, scopeId);
  const expandableIds = new Set(nodes.map(node => node.parentId).filter(Boolean));
  const visibleIds = new Set(visible.map(node => node.id));
  const selected = nodes.find(node => node.id === selectedId);
  const selectedEdge = relationships.find(edge => edge.id === edgeId);

  const flowNodes: FlowNode[] = visible.map(node => ({
    id: node.id, type: 'c4', position: { x: node.x, y: node.y }, selected: node.id === selectedId,
    data: { title: node.label, kind: node.kind, description: node.description, technology: node.technology,
      status: node.expectedPath, expandable: expandableIds.has(node.id),
      onSelect: () => { setSelectedId(node.id); setEdgeId(''); },
      onExplore: () => { setScopeId(node.id); setSelectedId(''); setEdgeId(''); } }
  }));

  const flowEdges = relationships.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map(edge => ({
    ...edge,
    type: 'smoothstep',
    label: edge.label,
    selected: edge.id === edgeId,
    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#6750A4' },
    style: { strokeWidth: 2, stroke: edge.id === edgeId ? '#0B57D0' : '#6750A4' },
    labelStyle: { fontSize: 11, fontWeight: 600, fill: '#1F1F1F' },
    labelBgStyle: { fill: '#F3EDF7', fillOpacity: 0.95 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 8,
  }));

  const navigate = (id: string) => { setScopeId(id); setSelectedId(''); setEdgeId(''); };
  const update = (patch: Partial<C4Node>) => onChangeNodes(nodes.map(node => node.id === selectedId ? { ...node, ...patch } : node));
  const remove = (ids: string[]) => {
    const remaining = removeC4Nodes(nodes, ids);
    const remainingIds = new Set(remaining.map(node => node.id));
    onChangeNodes(remaining);
    onChangeRelationships(relationships.filter(edge => remainingIds.has(edge.source) && remainingIds.has(edge.target)));
  };
  const addNode = () => {
    const node = createC4NodeInScope(nodes, scope?.id || '', crypto.randomUUID(), t('c4.newElement'));
    if (!node) return;
    onChangeNodes([...nodes, node]);
    setDesignTab('diagram');
    setSelectedId(node.id); setEdgeId('');
  };

  const field = (label: string, content: ReactNode) => (
    <label className="block space-y-1.5 text-xs font-semibold text-[#444746] dark:text-[#C4C7C5]">
      <span>{label}</span>
      {content}
    </label>
  );

  return (
    <div className="space-y-5">
      {/* Material Design 3 Control Header Card */}
      <div className="rounded-[24px] border border-slate-200/90 dark:border-[#33353A] bg-white dark:bg-[#1E1F23] p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center gap-1 bg-[#F0F4F9] dark:bg-[#121316] p-1 rounded-full border border-slate-200 dark:border-[#33353A]"
            role="tablist"
            aria-label={t('workspace.tabs.design')}
          >
            <button
              type="button"
              role="tab"
              id="design-tab-readme"
              aria-controls="design-panel-readme"
              aria-selected={designTab === 'readme'}
              onClick={() => setDesignTab('readme')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                designTab === 'readme'
                  ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white dark:hover:bg-[#282A2F] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>README.md</span>
            </button>
            <button
              type="button"
              role="tab"
              id="design-tab-diagram"
              aria-controls="design-panel-diagram"
              aria-selected={designTab === 'diagram'}
              onClick={() => setDesignTab('diagram')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                designTab === 'diagram'
                  ? 'bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] shadow-2xs'
                  : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-white dark:hover:bg-[#282A2F] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>C4 Model</span>
            </button>
          </div>
        </div>

        {designTab === 'diagram' && (
          <div className="border-t border-slate-200 dark:border-[#33353A] pt-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Material Design 3 Tonal Breadcrumb Pills */}
              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => navigate('')}
                  aria-current={!scope ? 'page' : undefined}
                  className="px-3 py-1 rounded-full font-mono text-xs transition border border-slate-200 dark:border-[#33353A] bg-[#F8FAFD] dark:bg-[#121316] text-[#0B57D0] dark:text-[#A8C7FA] hover:bg-[#D3E3FD]/60 dark:hover:bg-[#004A77]/60 aria-[current=page]:bg-[#D3E3FD] dark:aria-[current=page]:bg-[#004A77] aria-[current=page]:text-[#041E49] dark:aria-[current=page]:text-[#C2E7FF] aria-[current=page]:border-[#0B57D0] dark:aria-[current=page]:border-[#A8C7FA] aria-[current=page]:font-bold"
                >
                  C1 · Context
                </button>
                {path.map((node, index) => (
                  <span key={node.id} className="flex shrink-0 items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-[#5E5E5E] dark:text-[#8E918F]" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => navigate(node.id)}
                      aria-current={node.id === scope?.id ? 'page' : undefined}
                      className="px-3 py-1 rounded-full font-mono text-xs transition border border-slate-200 dark:border-[#33353A] bg-[#F8FAFD] dark:bg-[#121316] text-[#6750A4] dark:text-[#D0BCFF] hover:bg-[#EADDFF]/60 dark:hover:bg-[#4F378B]/60 aria-[current=page]:bg-[#EADDFF] dark:aria-[current=page]:bg-[#4F378B] aria-[current=page]:text-[#4F378B] dark:aria-[current=page]:text-[#EADDFF] aria-[current=page]:border-[#6750A4] dark:aria-[current=page]:border-[#D0BCFF] aria-[current=page]:font-bold"
                    >
                      C{index + 2} · {node.label}
                    </button>
                  </span>
                ))}
              </nav>

              {/* Material Design 3 Action Buttons */}
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addNode}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#6750A4] hover:bg-[#4F378B] dark:bg-[#D0BCFF] dark:hover:bg-[#EADDFF] px-3.5 py-1.5 text-xs font-semibold text-white dark:text-[#381E72] shadow-2xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('c4.addElement')}</span>
                </button>
                <button
                  type="button"
                  disabled={importing}
                  title={t('c4.fileHelp')}
                  onClick={() => fileInput.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] dark:hover:bg-[#004A77] text-[#1F1F1F] dark:text-[#E3E2E6] hover:text-[#041E49] dark:hover:text-[#C2E7FF] border border-slate-200 dark:border-[#33353A] px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                >
                  <Upload className="w-3.5 h-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
                  <span>{t(importing ? 'c4.importing' : 'c4.importModel')}</span>
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={exportModel}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] dark:hover:bg-[#004A77] text-[#1F1F1F] dark:text-[#E3E2E6] hover:text-[#041E49] dark:hover:text-[#C2E7FF] border border-slate-200 dark:border-[#33353A] px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-[#6750A4] dark:text-[#D0BCFF]" />
                  <span>{t('c4.exportModel')}</span>
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".json,application/json"
                  aria-label={t('c4.importModel')}
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void importModel(file);
                  }}
                />
              </div>
            </div>

            {fileStatus && (
              <p
                role={fileStatus === 'importSuccess' ? 'status' : 'alert'}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                  fileStatus === 'importSuccess'
                    ? 'bg-[#CEEAD6] dark:bg-[#0F5223]/50 border-[#81C995] text-[#0D652D] dark:text-[#C4EED0]'
                    : 'bg-[#FAD2CF] dark:bg-[#8C1D18]/40 border-[#F28B82] text-[#B3261E] dark:text-[#F2B8B5]'
                }`}
              >
                {t(`c4.${fileStatus}`)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area: README Panel or C4 Diagram Panel */}
      {designTab === 'readme' ? (
        <div
          role="tabpanel"
          id="design-panel-readme"
          aria-labelledby="design-tab-readme"
          className="bg-white dark:bg-[#1E1F23] rounded-[24px] border border-slate-200/90 dark:border-[#33353A] shadow-xs overflow-hidden transition-colors"
        >
          <div className="px-6 py-4 bg-[#F3EDF7] dark:bg-[#4F378B]/40 border-b border-[#EADDFF] dark:border-[#6750A4]/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] flex items-center justify-center shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#4F378B] dark:text-[#EADDFF]">
                {t('c4.designDoc')}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setReadmeMode(mode => (mode === 'reading' ? 'source' : 'reading'))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#121316] hover:bg-[#EADDFF] dark:hover:bg-[#4F378B] text-[#6750A4] dark:text-[#D0BCFF] border border-[#EADDFF] dark:border-[#6750A4] px-3.5 py-1.5 text-xs font-bold shadow-2xs transition"
            >
              {readmeMode === 'reading' ? (
                <Code2 className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{t(readmeMode === 'reading' ? 'c4.readmeSource' : 'c4.readmeReading')}</span>
            </button>
          </div>

          <div className="p-6">
            {readmeMode === 'source' ? (
              <textarea
                aria-label={t('c4.designDoc')}
                rows={22}
                className={`${fieldClass} font-mono`}
                value={designDoc}
                onChange={event => onChangeDesignDoc(event.target.value)}
              />
            ) : (
              <article className="min-h-96 break-words text-sm leading-7 text-[#1F1F1F] dark:text-[#E3E2E6] [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h4]:font-semibold [&_h1]:text-[#1F1F1F] dark:[&_h1]:text-[#E3E2E6] [&_h2]:text-[#1F1F1F] dark:[&_h2]:text-[#E3E2E6] [&_h1]:my-5 [&_h2]:my-4 [&_h3]:my-3 [&_p]:my-3 [&_p]:text-[#444746] dark:[&_p]:text-[#C4C7C5] [&_li]:text-[#444746] dark:[&_li]:text-[#C4C7C5] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-[#0B57D0] [&_a]:underline dark:[&_a]:text-[#A8C7FA] [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-[#F8FAFD] dark:[&_pre]:bg-[#121316] [&_pre]:border [&_pre]:border-slate-200 dark:[&_pre]:border-[#33353A] [&_pre]:p-4 [&_code]:font-mono [&_blockquote]:border-l-4 [&_blockquote]:border-[#6750A4] dark:[&_blockquote]:border-[#D0BCFF] [&_blockquote]:bg-[#F3EDF7]/40 dark:[&_blockquote]:bg-[#4F378B]/20 [&_blockquote]:py-1 [&_blockquote]:pl-4 [&_blockquote]:rounded-r-xl [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-[#33353A] [&_th]:bg-[#F0F4F9] dark:[&_th]:bg-[#282A2F] [&_th]:p-2.5 [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-[#33353A] [&_td]:p-2.5 [&_hr]:my-5 [&_hr]:border-slate-200 dark:[&_hr]:border-[#33353A] [&_img]:max-w-full">
                <Markdown remarkPlugins={[remarkGfm]}>{designDoc}</Markdown>
              </article>
            )}
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="design-panel-diagram"
          aria-labelledby="design-tab-diagram"
          className="space-y-5"
        >
          <div className="relative">
            <div className="overflow-hidden rounded-[24px] border border-slate-200/90 dark:border-[#33353A] bg-[#F8FAFD] dark:bg-[#121316] shadow-xs transition-colors">
              {/* Material Design 3 Tonal Canvas Header Bar */}
              <div className="flex items-center justify-between border-b border-[#EADDFF] dark:border-[#6750A4]/50 bg-[#F3EDF7] dark:bg-[#4F378B]/40 px-5 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[#4F378B] dark:text-[#EADDFF]">
                    {scope ? scope.label : 'System Context'}
                  </span>
                </div>

                <details className="relative group">
                  <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#121316] text-[#6750A4] dark:text-[#D0BCFF] border border-[#EADDFF] dark:border-[#6750A4] font-bold hover:bg-[#EADDFF]/50 transition">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{t('c4.help')}</span>
                  </summary>
                  <div className="absolute right-0 top-9 z-30 w-80 rounded-2xl border border-slate-200 dark:border-[#33353A] bg-white dark:bg-[#1E1F23] p-4 shadow-xl space-y-2.5 text-xs text-[#444746] dark:text-[#C4C7C5]">
                    <p className="leading-relaxed">{t('c4.canvasInstructions')}</p>
                    <p className="leading-relaxed">{t('c4.levelsDescription')}</p>
                    <div className="pt-1 border-t border-slate-200 dark:border-[#33353A] space-y-1">
                      <p className="font-semibold text-[#0B57D0] dark:text-[#A8C7FA]">
                        ● {t('c4.expandable')}
                      </p>
                      <p className="font-semibold text-[#6750A4] dark:text-[#D0BCFF]">
                        ● {t('c4.leaf')}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#5E5E5E] dark:text-[#8E918F] pt-1 border-t border-slate-200 dark:border-[#33353A]">
                      {t('c4.fileHelp')}
                    </p>
                  </div>
                </details>
              </div>

              <div style={{ height: 'max(600px, 72vh)' }}>
                <C4Canvas
                  key={`${importRevision}-${scope?.id || 'context'}`}
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  fitView
                  minZoom={0.15}
                  maxZoom={2}
                  onNodeClick={(_, node) => {
                    setSelectedId(node.id);
                    setEdgeId('');
                  }}
                  onNodeDoubleClick={(_, node) => navigate(node.id)}
                  zoomOnDoubleClick={false}
                  onEdgeClick={(_, edge) => {
                    setEdgeId(edge.id);
                    setSelectedId('');
                  }}
                  onNodesChange={changes => {
                    const positions = new Map(
                      changes.flatMap(change =>
                        change.type === 'position' && change.position ? [[change.id, change] as const] : []
                      )
                    );
                    if (positions.size)
                      onChangeNodes(
                        nodes.map(node => {
                          const change = positions.get(node.id);
                          return change?.type === 'position' && change.position
                            ? {
                                ...node,
                                x: change.position.x,
                                y: change.position.y,
                              }
                            : node;
                        })
                      );
                  }}
                  onNodesDelete={deleted => remove(deleted.map(node => node.id))}
                  onEdgesDelete={deleted =>
                    onChangeRelationships(
                      relationships.filter(edge => !deleted.some(item => item.id === edge.id))
                    )
                  }
                  isValidConnection={connection =>
                    connection.source !== connection.target &&
                    !relationships.some(
                      edge => edge.source === connection.source && edge.target === connection.target
                    )
                  }
                  onConnect={connection => {
                    const id = crypto.randomUUID();
                    onChangeRelationships([
                      ...relationships,
                      {
                        id,
                        source: connection.source,
                        target: connection.target,
                        label: t('c4.uses'),
                        technology: '',
                      },
                    ]);
                    setEdgeId(id);
                    setSelectedId('');
                  }}
                >
                  <Background gap={24} color="#94A3B8" />
                  <Controls />
                  <MiniMap
                    nodeColor={node =>
                      (node.data as FlowNode['data']).expandable ? colors.expandable : colors.leaf
                    }
                    pannable
                    zoomable
                  />
                </C4Canvas>
              </div>
              {!inside.length && (
                <p className="p-4 text-xs sm:text-sm font-medium text-[#444746] dark:text-[#C4C7C5] bg-white dark:bg-[#1E1F23] border-t border-slate-200 dark:border-[#33353A]">
                  {t('c4.emptyLevel')}
                </p>
              )}
            </div>

            {/* Material Design 3 Floating Inspector Drawer */}
            {(selected || selectedEdge) && (
              <aside
                aria-label={t(selected ? 'c4.editElement' : 'c4.editRelationship')}
                className="absolute right-4 top-16 z-20 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-5rem)] overflow-y-auto rounded-[24px] border border-slate-200 dark:border-[#33353A] bg-white dark:bg-[#1E1F23] p-4 shadow-xl"
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setSelectedId('');
                    setEdgeId('');
                  }
                }}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#33353A]">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF] font-mono text-xs font-bold">
                    {selected ? `${t('c4.editElement')} · ${selected.kind}` : t('c4.editRelationship')}
                  </span>
                  <button
                    type="button"
                    aria-label={t('c4.closeEditor')}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] hover:bg-[#F0F4F9] dark:hover:bg-[#282A2F] transition"
                    onClick={() => {
                      setSelectedId('');
                      setEdgeId('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selected && (
                  <div className="space-y-3.5">
                    {field(
                      t('c4.name'),
                      <input
                        className={fieldClass}
                        value={selected.label}
                        onChange={event => update({ label: event.target.value })}
                      />
                    )}
                    {selected.parentId &&
                      field(
                        t('c4.parentBoundary'),
                        <p className="px-3 py-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E2E6]">
                          {nodes.find(node => node.id === selected.parentId)?.label}
                        </p>
                      )}
                    {field(
                      t('c4.technology'),
                      <input
                        className={`${fieldClass} font-mono`}
                        value={selected.technology}
                        onChange={event => update({ technology: event.target.value })}
                        placeholder="React / REST / MySQL"
                      />
                    )}
                    {field(
                      t('c4.responsibilities'),
                      <textarea
                        rows={3}
                        className={fieldClass}
                        value={selected.description}
                        onChange={event => update({ description: event.target.value })}
                      />
                    )}
                    {field(
                      t('c4.githubPath'),
                      <input
                        className={`${fieldClass} font-mono`}
                        value={selected.expectedPath}
                        onChange={event => update({ expectedPath: event.target.value })}
                        placeholder="src/"
                      />
                    )}
                    <button
                      type="button"
                      className="w-full mt-2 px-3.5 py-2 rounded-xl bg-[#FAD2CF]/60 dark:bg-[#8C1D18]/40 hover:bg-[#FAD2CF] dark:hover:bg-[#8C1D18]/60 text-[#B3261E] dark:text-[#F2B8B5] border border-[#F28B82] dark:border-[#8C1D18] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                      onClick={() => remove([selected.id])}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('c4.deleteElement')}</span>
                    </button>
                  </div>
                )}

                {selectedEdge && (
                  <div className="space-y-3.5">
                    <p className="px-3 py-1.5 rounded-xl bg-[#F0F4F9] dark:bg-[#282A2F] text-xs font-mono font-semibold text-[#0B57D0] dark:text-[#A8C7FA]">
                      {nodes.find(node => node.id === selectedEdge.source)?.label} →{' '}
                      {nodes.find(node => node.id === selectedEdge.target)?.label}
                    </p>
                    {field(
                      t('c4.relationshipDescription'),
                      <input
                        className={fieldClass}
                        value={selectedEdge.label}
                        onChange={event =>
                          onChangeRelationships(
                            relationships.map(edge =>
                              edge.id === edgeId ? { ...edge, label: event.target.value } : edge
                            )
                          )
                        }
                      />
                    )}
                    {field(
                      t('c4.protocol'),
                      <input
                        className={`${fieldClass} font-mono`}
                        value={selectedEdge.technology}
                        onChange={event =>
                          onChangeRelationships(
                            relationships.map(edge =>
                              edge.id === edgeId ? { ...edge, technology: event.target.value } : edge
                            )
                          )
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="w-full mt-2 px-3.5 py-2 rounded-xl bg-[#FAD2CF]/60 dark:bg-[#8C1D18]/40 hover:bg-[#FAD2CF] dark:hover:bg-[#8C1D18]/60 text-[#B3261E] dark:text-[#F2B8B5] border border-[#F28B82] dark:border-[#8C1D18] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                      onClick={() =>
                        onChangeRelationships(relationships.filter(edge => edge.id !== edgeId))
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('c4.deleteRelationship')}</span>
                    </button>
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
