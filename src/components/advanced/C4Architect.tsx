import { useEffect, useRef, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReactFlow, applyNodeChanges, Background, Controls, MiniMap, Handle, Position, MarkerType, type Node, type NodeProps, type ReactFlowProps } from '@xyflow/react';
import { useI18n } from '../../i18n';
import { parentKind, removeC4Nodes, c4Drilldown, createC4NodeInScope, type C4Kind, type C4Node, type C4Relationship } from '../../utils/c4Model';
import { C4_FILE_MAX_BYTES, parseC4File, serializeC4File } from '../../utils/c4File';

const colors = { expandable: '#2563eb', leaf: '#64748b' };
const boundaryId = '__c4_boundary__';
type FlowNode = Node<{ title: string; kind: C4Kind; description: string; technology: string; status: string; expandable: boolean; onExplore: () => void }, 'c4'>;
function C4Card({ data, selected }: NodeProps<FlowNode>) {
  const { t } = useI18n();
  const color = data.expandable ? colors.expandable : colors.leaf;
  return <div style={{ width: 240, height: 230, borderColor: color, background: data.expandable ? '#eff6ff' : '#f8fafc' }} className={`rounded-xl border-2 bg-white p-4 text-slate-900 shadow-sm ${selected ? 'ring-4 ring-violet-300' : ''}`}>
    <Handle type="target" position={Position.Left} />
    <div className="text-[10px] uppercase tracking-widest" style={{ color: color }}>{data.kind}</div>
    <div className="mt-1 font-bold break-words line-clamp-2">{data.title}</div>
    {data.technology && <div className="mt-1 text-xs text-slate-500 truncate">[{data.technology}]</div>}
    <p className="mt-2 text-xs text-slate-600 break-words whitespace-pre-wrap line-clamp-2">{data.description}</p>
    {data.status && <p className="mt-3 border-t pt-2 text-[10px] text-slate-600 truncate">{data.status}</p>}
    <button type="button" className="nodrag nopan mt-2 text-xs font-semibold underline" style={{ color }}
      onClick={event => { event.stopPropagation(); data.onExplore(); }}>{t(data.expandable ? 'c4.expandable' : 'c4.leaf')} →</button>
    <Handle type="source" position={Position.Right} />
  </div>;
}
type BoundaryNode = Node<{ title: string }, 'boundary'>;
function C4Boundary({ data }: NodeProps<BoundaryNode>) {
  return <div className="h-full w-full rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40">
    <div title={data.title} className="truncate px-5 py-3 text-sm font-bold text-blue-900">{data.title}</div>
    <Handle type="target" position={Position.Left} /><Handle type="source" position={Position.Right} />
  </div>;
}
const nodeTypes = { c4: C4Card, boundary: C4Boundary };
type CanvasNode = FlowNode | BoundaryNode;

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
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:bg-[#282A2F] dark:text-[#E3E2E6] dark:border-[#444746]';
const panelClass = 'rounded-2xl border border-slate-200 bg-white p-4 dark:bg-[#1E1F23] dark:border-[#33353A] space-y-3';

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
  const { scope, path, inside, outside, visible } = c4Drilldown(nodes, scopeId);
  const expandableIds = new Set(nodes.map(node => node.parentId).filter(Boolean));
  const visibleIds = new Set(visible.map(node => node.id));
  const selected = nodes.find(node => node.id === selectedId);
  const selectedEdge = relationships.find(edge => edge.id === edgeId);
  // The coordinate origin must stay fixed while this scope is open, even when its leftmost node moves.
  const [origin, setOrigin] = useState({ scopeId: scope?.id, x: 40 - Math.min(0, ...inside.map(node => node.x)), y: 70 - Math.min(0, ...inside.map(node => node.y)) });
  let offset = origin;
  if (origin.scopeId !== scope?.id) {
    offset = { scopeId: scope?.id, x: 40 - Math.min(0, ...inside.map(node => node.x)), y: 70 - Math.min(0, ...inside.map(node => node.y)) };
    setOrigin(offset);
  }
  const width = Math.max(380, ...inside.map(node => node.x + offset.x + 280));
  const height = Math.max(350, ...inside.map(node => node.y + offset.y + 270));
  const flowNodes: (FlowNode | BoundaryNode)[] = [
    ...(scope ? [{ id: boundaryId, type: 'boundary' as const, position: { x: 0, y: 0 },
      style: { width, height }, draggable: false, selectable: false, deletable: false,
      data: { title: scope.label + ' [' + scope.kind + ']' } }] : []),
    ...visible.map(node => {
      const externalIndex = outside.findIndex(item => item.id === node.id);
      const external = externalIndex >= 0;
      return { id: node.id, type: 'c4' as const,
        ...(scope && !external ? { parentId: boundaryId, extent: [[40, 70], [width - 40, height - 40]] as [[number, number], [number, number]] } : {}), draggable: !external,
        position: external ? { x: width + 100 + Math.floor(externalIndex / 3) * 310, y: (externalIndex % 3) * 280 }
          : { x: node.x + (scope ? offset.x : 0), y: node.y + (scope ? offset.y : 0) },
        selected: node.id === selectedId,
        ariaLabel: node.label + ': ' + t(expandableIds.has(node.id) ? 'c4.expandable' : 'c4.leaf'),
        data: { title: node.label, kind: node.kind, description: node.description, technology: node.technology,
          status: node.expectedPath, expandable: expandableIds.has(node.id),
          onExplore: () => { setScopeId(node.id); setSelectedId(node.id); setEdgeId(''); } } };
    })];
  const flowEdges = relationships.filter(edge => (visibleIds.has(edge.source) || edge.source === scope?.id) &&
    (visibleIds.has(edge.target) || edge.target === scope?.id)).map(edge => ({ ...edge,
    source: edge.source === scope?.id ? boundaryId : edge.source,
    target: edge.target === scope?.id ? boundaryId : edge.target,
    label: edge.label + (edge.technology ? ' [' + edge.technology + ']' : ''), selected: edge.id === edgeId,
    markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, labelStyle: { fontSize: 12 } }));
  const navigate = (id: string) => { setScopeId(id); setSelectedId(''); setEdgeId(''); };
  const realId = (id: string) => id === boundaryId ? scope!.id : id;
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
  const field = (label: string, content: ReactNode) => <label className="block space-y-1 text-xs text-slate-600 dark:text-slate-300"><span>{label}</span>{content}</label>;
  return <div className="space-y-5">
    <div className={panelClass}>
      <h3 className="font-bold text-slate-900 dark:text-white">{t('c4.title')}</h3>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('workspace.tabs.design')}>
        <button type="button" role="tab" id="design-tab-readme" aria-controls="design-panel-readme" aria-selected={designTab === 'readme'} onClick={() => setDesignTab('readme')} className={`rounded-lg px-3 py-2 text-sm ${designTab === 'readme' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>README.md</button>
        <button type="button" role="tab" id="design-tab-diagram" aria-controls="design-panel-diagram" aria-selected={designTab === 'diagram'}
          onClick={() => setDesignTab('diagram')} className={designTab === 'diagram' ? 'rounded-lg px-3 py-2 text-sm bg-blue-700 text-white' : 'rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-700'}>C4 Model</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={importing} onClick={() => fileInput.current?.click()} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 disabled:opacity-40">{t(importing ? 'c4.importing' : 'c4.importModel')}</button>
        <button type="button" disabled={importing} onClick={exportModel} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 disabled:opacity-40">{t('c4.exportModel')}</button>
        <input ref={fileInput} type="file" accept=".json,application/json" aria-label={t('c4.importModel')} className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importModel(file);
        }} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">{t('c4.fileHelp')}</p>
      {fileStatus && <p role={fileStatus === 'importSuccess' ? 'status' : 'alert'} className={fileStatus === 'importSuccess' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>{t(`c4.${fileStatus}`)}</p>}
    </div>
    {designTab === 'readme' ? <div role="tabpanel" id="design-panel-readme" aria-labelledby="design-tab-readme" className={panelClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('c4.designDoc')}</h4>
        <button type="button"
          onClick={() => setReadmeMode(mode => mode === 'reading' ? 'source' : 'reading')}
          className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-800">
          {t(readmeMode === 'reading' ? 'c4.readmeSource' : 'c4.readmeReading')}
        </button>
      </div>
      {readmeMode === 'source' ? <textarea aria-label={t('c4.designDoc')} rows={22} className={`${fieldClass} font-mono`} value={designDoc} onChange={event => onChangeDesignDoc(event.target.value)} />
        : <article className="min-h-96 break-words text-sm leading-7 text-slate-800 dark:text-slate-200 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h4]:font-semibold [&_h1]:my-5 [&_h2]:my-4 [&_h3]:my-3 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-300 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 dark:[&_pre]:bg-[#282A2F] [&_pre]:p-4 [&_code]:font-mono [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_hr]:my-5 [&_img]:max-w-full">
          <Markdown remarkPlugins={[remarkGfm]}>{designDoc}</Markdown>
        </article>}
    </div> : <div role="tabpanel" id="design-panel-diagram" aria-labelledby="design-tab-diagram" className="space-y-5">
    <div className={panelClass}>
      <p className="text-xs text-slate-500 dark:text-slate-300">{t('c4.levelsDescription')}</p>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => navigate('')} aria-current={!scope ? 'page' : undefined} className="text-blue-700 underline aria-[current=page]:font-bold dark:text-blue-300">C1 · Context</button>
        {path.map((node, index) => <span key={node.id} className="flex items-center gap-2">
          <span aria-hidden="true">/</span><button type="button" onClick={() => navigate(node.id)} aria-current={node.id === scope?.id ? 'page' : undefined} className="text-blue-700 underline aria-[current=page]:font-bold dark:text-blue-300">C{index + 2} · {node.label}</button>
        </span>)}
      </nav>
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="text-blue-600">● {t('c4.expandable')}</span><span className="text-slate-500">● {t('c4.leaf')}</span>
      </div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="border-b p-3 text-xs text-slate-600">{scope ? scope.label : 'System Context'} · {t('c4.canvasInstructions')}</div>
        <div style={{ height: 600 }}>
          <C4Canvas key={`${importRevision}-${scope?.id || 'context'}`} nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} fitView minZoom={0.15} maxZoom={2}
            onNodeClick={(_, node) => { if (node.id === boundaryId) return; setScopeId(node.id); setSelectedId(node.id); setEdgeId(''); }}
            onEdgeClick={(_, edge) => { setEdgeId(edge.id); setSelectedId(''); }}
            onNodesChange={changes => {
              const positions = new Map(changes.flatMap(change => change.type === 'position' && change.position ? [[change.id, change] as const] : []));
              if (positions.size) onChangeNodes(nodes.map(node => { const change = positions.get(node.id); return change?.type === 'position' && change.position ? { ...node,
                x: scope ? Math.max(40, change.position.x) - offset.x : change.position.x,
                y: scope ? Math.max(70, change.position.y) - offset.y : change.position.y } : node; }));
            }}
            onNodesDelete={deleted => remove(deleted.map(node => node.id))}
            onEdgesDelete={deleted => onChangeRelationships(relationships.filter(edge => !deleted.some(item => item.id === edge.id)))}
            isValidConnection={connection => connection.source !== connection.target && !relationships.some(edge => edge.source === realId(connection.source) && edge.target === realId(connection.target))}
            onConnect={connection => { const id = crypto.randomUUID(); onChangeRelationships([...relationships, { id, source: realId(connection.source), target: realId(connection.target), label: t('c4.uses'), technology: '' }]); setEdgeId(id); setSelectedId(''); }}>
            <Background gap={24} /><Controls /><MiniMap nodeColor={node => node.type === 'boundary' ? '#dbeafe' : (node.data as FlowNode['data']).expandable ? colors.expandable : colors.leaf} pannable zoomable />
          </C4Canvas>
        </div>
        {!inside.length && <p className="p-4 text-sm text-slate-600">{t(scope?.kind === 'person' || scope?.kind === 'code' ? 'c4.terminalLevel' : 'c4.emptyLevel')}</p>}
      </div>
      <aside className="space-y-4">
        <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{t('c4.addTitle')}</h4>
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40" onClick={addNode} disabled={scope?.kind === 'person' || scope?.kind === 'code'}>{t('c4.addInCurrentLevel')}</button>
        </div>
        {selected && <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{t('c4.editElement')} · {selected.kind}</h4>
          {field(t('c4.name'), <input className={fieldClass} value={selected.label} onChange={event => update({ label: event.target.value })} />)}
          {parentKind[selected.kind] && field(t('c4.parentBoundary'), <select className={fieldClass} value={selected.parentId || ''} onChange={event => update({ parentId: event.target.value })}>{nodes.filter(node => node.kind === parentKind[selected.kind]).map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select>)}
          {field(t('c4.technology'), <input className={fieldClass} value={selected.technology} onChange={event => update({ technology: event.target.value })} placeholder="React / REST / PostgreSQL" />)}
          {field(t('c4.responsibilities'), <textarea className={fieldClass} value={selected.description} onChange={event => update({ description: event.target.value })} />)}
          {field(t('c4.githubPath'), <input className={fieldClass} value={selected.expectedPath} onChange={event => update({ expectedPath: event.target.value })} placeholder="src/" />)}
          <button className="text-sm text-red-600" onClick={() => remove([selected.id])}>{t('c4.deleteElement')}</button>
        </div>}
        {selectedEdge && <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{t('c4.editRelationship')}</h4>
          <p className="text-xs text-slate-500">{nodes.find(node => node.id === selectedEdge.source)?.label} → {nodes.find(node => node.id === selectedEdge.target)?.label}</p>
          {field(t('c4.relationshipDescription'), <input className={fieldClass} value={selectedEdge.label} onChange={event => onChangeRelationships(relationships.map(edge => edge.id === edgeId ? { ...edge, label: event.target.value } : edge))} />)}
          {field(t('c4.protocol'), <input className={fieldClass} value={selectedEdge.technology} onChange={event => onChangeRelationships(relationships.map(edge => edge.id === edgeId ? { ...edge, technology: event.target.value } : edge))} />)}
          <button className="text-sm text-red-600" onClick={() => onChangeRelationships(relationships.filter(edge => edge.id !== edgeId))}>{t('c4.deleteRelationship')}</button>
        </div>}
      </aside>
    </div>
    </div>}
  </div>;
}
