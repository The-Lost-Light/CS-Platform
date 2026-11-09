import { useEffect, useRef, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReactFlow, applyNodeChanges, Background, Controls, MiniMap, Handle, Position, MarkerType, type Node, type NodeProps, type ReactFlowProps } from '@xyflow/react';
import { useI18n } from '../../i18n';
import { removeC4Nodes, c4Drilldown, createC4NodeInScope, type C4Kind, type C4Node, type C4Relationship } from '../../utils/c4Model';
import { C4_FILE_MAX_BYTES, parseC4File, serializeC4File } from '../../utils/c4File';

const colors = { expandable: '#2563eb', leaf: '#64748b' };
type FlowNode = Node<{ title: string; kind: C4Kind; description: string; technology: string; status: string; expandable: boolean; onSelect: () => void; onExplore: () => void }, 'c4'>;
function C4Card({ data, selected }: NodeProps<FlowNode>) {
  const color = data.expandable ? colors.expandable : colors.leaf;
  return <div role="button" tabIndex={0} aria-label={data.title} onKeyDown={event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (event.key === 'Enter' && event.shiftKey) data.onExplore(); else data.onSelect(); }
  }} style={{ width: 280, minHeight: 230, borderColor: color, background: data.expandable ? '#eff6ff' : '#f8fafc' }} className={`rounded-xl border-2 bg-white p-4 text-slate-900 shadow-sm ${selected ? 'ring-4 ring-violet-300' : ''}`}>
    <Handle type="target" position={Position.Left} />
    <div className="text-[10px] uppercase tracking-widest" style={{ color: color }}>{data.kind}</div>
    <div className="mt-1 font-bold break-words">{data.title}</div>
    {data.technology && <div className="mt-1 text-xs text-slate-500 break-words break-words">[{data.technology}]</div>}
    <p className="mt-2 text-xs text-slate-600 break-words whitespace-pre-wrap">{data.description}</p>
    {data.status && <p className="mt-3 border-t pt-2 text-[10px] text-slate-600 break-words">{data.status}</p>}
    <Handle type="source" position={Position.Right} />
  </div>;
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
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:bg-[#282A2F] dark:text-[#E3E2E6] dark:border-[#444746]';
const panelClass = 'rounded-2xl border border-slate-200 bg-white p-4 dark:bg-[#1E1F23] dark:border-[#33353A] space-y-3';

export function C4Architect({ nodes, onChangeNodes, relationships, onChangeRelationships, designDoc, onChangeDesignDoc }: {
  nodes: C4Node[]; onChangeNodes: (nodes: C4Node[]) => void;
  relationships: C4Relationship[]; onChangeRelationships: (edges: C4Relationship[]) => void;
  designDoc: string; onChangeDesignDoc: (doc: string) => void;
}) {
  const { t } = useI18n();
  const [designTab, setDesignTab] = useState<'readme' | 'diagram'>('readme');
  const fullscreenRoot = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const exitFullscreen = () => {
    if (document.fullscreenElement === fullscreenRoot.current) void document.exitFullscreen().catch(() => {});
    setFullscreen(false);
  };
  const toggleFullscreen = async () => {
    if (fullscreen) { exitFullscreen(); return; }
    try { await fullscreenRoot.current?.requestFullscreen(); }
    catch { /* Embedded browsers may block the API; use the viewport layout instead. */ }
    setFullscreen(true);
  };
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === fullscreenRoot.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') exitFullscreen(); };
    document.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', escape); };
  }, [fullscreen]);
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
  const flowEdges = relationships.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map(edge => ({ ...edge,
    type: 'smoothstep', label: edge.label, selected: edge.id === edgeId,
    markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22 },
    style: { strokeWidth: 2, stroke: '#475569' }, labelStyle: { fontSize: 12, fill: '#0f172a' },
    labelBgStyle: { fill: '#fff', fillOpacity: 1 }, labelBgPadding: [8, 5] as [number, number], labelBgBorderRadius: 4
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
  const field = (label: string, content: ReactNode) => <label className="block space-y-1 text-xs text-slate-600 dark:text-slate-300"><span>{label}</span>{content}</label>;
  return <div ref={fullscreenRoot} className={fullscreen ? 'fixed inset-0 z-[100] flex h-dvh w-screen flex-col gap-2 overflow-hidden bg-slate-100 p-3 dark:bg-[#131418]' : 'space-y-3'}>
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:bg-[#1E1F23] dark:border-[#33353A]">

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('workspace.tabs.design')}>
        <button type="button" role="tab" id="design-tab-readme" aria-controls="design-panel-readme" aria-selected={designTab === 'readme'} onClick={() => { exitFullscreen(); setDesignTab('readme'); }} className={`rounded-lg px-3 py-1.5 text-xs ${designTab === 'readme' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>README.md</button>
        <button type="button" role="tab" id="design-tab-diagram" aria-controls="design-panel-diagram" aria-selected={designTab === 'diagram'}
          onClick={() => setDesignTab('diagram')} className={designTab === 'diagram' ? 'rounded-lg px-3 py-1.5 text-xs bg-blue-700 text-white' : 'rounded-lg px-3 py-1.5 text-xs bg-slate-100 text-slate-700'}>C4 Model</button>
      </div>
      {designTab === 'diagram' && <div className="mt-2 border-t border-slate-200 pt-2 dark:border-[#33353A]">

      <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap py-1 text-xs">
        <button type="button" onClick={() => navigate('')} aria-current={!scope ? 'page' : undefined} className="text-blue-700 underline aria-[current=page]:font-bold dark:text-blue-300">C1 · Context</button>
        {path.map((node, index) => <span key={node.id} className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true">/</span><button type="button" onClick={() => navigate(node.id)} aria-current={node.id === scope?.id ? 'page' : undefined} className="text-blue-700 underline aria-[current=page]:font-bold dark:text-blue-300">C{index + 2} · {node.label}</button>
        </span>)}
      </nav>
      <div className="ml-auto flex shrink-0 flex-wrap gap-2">
        <button type="button" aria-pressed={fullscreen} onClick={() => void toggleFullscreen()} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700">{t(fullscreen ? 'c4.exitFullscreen' : 'c4.fullscreen')}</button>
      <button type="button" className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs text-white hover:bg-blue-800" onClick={addNode}>＋ {t('c4.addElement')}</button>
        <button type="button" disabled={importing} title={t('c4.fileHelp')} onClick={() => fileInput.current?.click()} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-40">{t(importing ? 'c4.importing' : 'c4.importModel')}</button>
        <button type="button" disabled={importing} onClick={exportModel} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-40">{t('c4.exportModel')}</button>
        <input ref={fileInput} type="file" accept=".json,application/json" aria-label={t('c4.importModel')} className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importModel(file);
        }} />
      </div>
      </div>


      {fileStatus && <p role={fileStatus === 'importSuccess' ? 'status' : 'alert'} className={fileStatus === 'importSuccess' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>{t(`c4.${fileStatus}`)}</p>}


      </div>}
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
    </div> : <div role="tabpanel" id="design-panel-diagram" aria-labelledby="design-tab-diagram" className={fullscreen ? 'flex min-h-0 flex-1 flex-col' : 'space-y-5'}>
    <div className={fullscreen ? 'relative flex min-h-0 flex-1 flex-col' : 'relative'}>
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${fullscreen ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
        <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-slate-600"><span>{scope ? scope.label : 'System Context'}</span><details className="relative"><summary className="cursor-pointer">{t('c4.help')}</summary><div className="absolute right-0 top-6 z-30 w-72 rounded-lg border bg-white p-3 shadow-lg space-y-2"><p>{t('c4.canvasInstructions')}</p><p>{t('c4.levelsDescription')}</p><p className="text-blue-600">● {t('c4.expandable')}</p><p>● {t('c4.leaf')}</p><p>{t('c4.fileHelp')}</p></div></details></div>
        <div className={fullscreen ? 'min-h-0 flex-1' : ''} style={fullscreen ? undefined : { height: 'max(600px, 72vh)' }}>
          <C4Canvas key={`${importRevision}-${scope?.id || 'context'}`} nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} fitView minZoom={0.15} maxZoom={2}
            onNodeClick={(_, node) => { setSelectedId(node.id); setEdgeId(''); }}
            onNodeDoubleClick={(_, node) => navigate(node.id)}
            zoomOnDoubleClick={false}
            onEdgeClick={(_, edge) => { setEdgeId(edge.id); setSelectedId(''); }}
            onNodesChange={changes => {
              const positions = new Map(changes.flatMap(change => change.type === 'position' && change.position ? [[change.id, change] as const] : []));
              if (positions.size) onChangeNodes(nodes.map(node => { const change = positions.get(node.id); return change?.type === 'position' && change.position ? { ...node,
                x: change.position.x,
                y: change.position.y } : node; }));
            }}
            onNodesDelete={deleted => remove(deleted.map(node => node.id))}
            onEdgesDelete={deleted => onChangeRelationships(relationships.filter(edge => !deleted.some(item => item.id === edge.id)))}
            isValidConnection={connection => connection.source !== connection.target && !relationships.some(edge => edge.source === connection.source && edge.target === connection.target)}
            onConnect={connection => { const id = crypto.randomUUID(); onChangeRelationships([...relationships, { id, source: connection.source, target: connection.target, label: t('c4.uses'), technology: '' }]); setEdgeId(id); setSelectedId(''); }}>
            <Background gap={24} /><Controls /><MiniMap nodeColor={node => (node.data as FlowNode['data']).expandable ? colors.expandable : colors.leaf} pannable zoomable />
          </C4Canvas>
        </div>
        {!inside.length && <p className="p-4 text-sm text-slate-600">{t('c4.emptyLevel')}</p>}
      </div>
      {(selected || selectedEdge) && <aside aria-label={t(selected ? 'c4.editElement' : 'c4.editRelationship')} className="absolute right-3 top-14 z-20 w-80 max-w-[calc(100%-1.5rem)] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-[#33353A] dark:bg-[#1E1F23]" onKeyDown={event => { if (event.key === 'Escape') { setSelectedId(''); setEdgeId(''); } }}>
        <div className="flex justify-end"><button type="button" aria-label={t('c4.closeEditor')} className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100" onClick={() => { setSelectedId(''); setEdgeId(''); }}>×</button></div>
        {selected && <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{t('c4.editElement')} · {selected.kind}</h4>
          {field(t('c4.name'), <input className={fieldClass} value={selected.label} onChange={event => update({ label: event.target.value })} />)}
          {selected.parentId && field(t('c4.parentBoundary'), <p className="text-sm">{nodes.find(node => node.id === selected.parentId)?.label}</p>)}
          {field(t('c4.technology'), <input className={fieldClass} value={selected.technology} onChange={event => update({ technology: event.target.value })} placeholder="React / REST / MySQL" />)}
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
      </aside>}
    </div>
    </div>}
  </div>;
}
