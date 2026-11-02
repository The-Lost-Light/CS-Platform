import { useState, type ReactNode } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType, type Node, type NodeProps } from '@xyflow/react';
import { useI18n } from '../../i18n';
import { parentKind, removeC4Nodes, visibleC4Nodes, type C4Kind, type C4Node, type C4Relationship } from '../../utils/c4Model';

const kinds: C4Kind[] = ['person', 'system', 'container', 'component', 'code'];
const colors = { person: '#475569', system: '#1d4ed8', container: '#0369a1', component: '#0f766e', code: '#7e22ce' };
type FlowNode = Node<{ title: string; kind: C4Kind; description: string; technology: string; status: string }, 'c4'>;
function C4Card({ data, selected }: NodeProps<FlowNode>) {
  return <div style={{ width: 240, borderColor: colors[data.kind] }} className={`rounded-xl border-2 bg-white p-4 text-slate-900 shadow-sm ${selected ? 'ring-4 ring-violet-300' : ''}`}>
    <Handle type="target" position={Position.Left} />
    <div className="text-[10px] uppercase tracking-widest" style={{ color: colors[data.kind] }}>{data.kind}</div>
    <div className="mt-1 font-bold break-words">{data.title}</div>
    {data.technology && <div className="mt-1 text-xs text-slate-500">[{data.technology}]</div>}
    <p className="mt-2 text-xs text-slate-600 break-words whitespace-pre-wrap">{data.description}</p>
    {data.status && <p className="mt-3 border-t pt-2 text-[10px] text-slate-600">{data.status}</p>}
    <Handle type="source" position={Position.Right} />
  </div>;
}
const nodeTypes = { c4: C4Card };
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:bg-[#282A2F] dark:text-[#E3E2E6] dark:border-[#444746]';
const panelClass = 'rounded-2xl border border-slate-200 bg-white p-4 dark:bg-[#1E1F23] dark:border-[#33353A] space-y-3';

export function C4Architect({ nodes, onChangeNodes, relationships, onChangeRelationships, designDoc, onChangeDesignDoc }: {
  nodes: C4Node[]; onChangeNodes: (nodes: C4Node[]) => void;
  relationships: C4Relationship[]; onChangeRelationships: (edges: C4Relationship[]) => void;
  designDoc: string; onChangeDesignDoc: (doc: string) => void;
}) {
  const { t } = useI18n();
  const [designTab, setDesignTab] = useState<'readme' | C4Kind>('readme');
  const [level, setLevel] = useState<C4Kind>('system');
  const [scopeId, setScopeId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [edgeId, setEdgeId] = useState('');
  const [newKind, setNewKind] = useState<C4Kind>('person');
  const scopes = nodes.filter(node => node.kind === parentKind[level]);
  const scope = scopes.find(node => node.id === scopeId) || scopes[0];
  const visible = visibleC4Nodes(nodes, level, scope?.id || '');
  const visibleIds = new Set(visible.map(node => node.id));
  const selected = nodes.find(node => node.id === selectedId);
  const selectedEdge = relationships.find(edge => edge.id === edgeId);
  const flowNodes: FlowNode[] = visible.map(node => ({ id: node.id, type: 'c4', position: { x: node.x, y: node.y }, selected: node.id === selectedId,
    data: { title: node.label, kind: node.kind, description: node.description, technology: node.technology,
      status: node.expectedPath } }));
  const flowEdges = relationships.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map(edge => ({ ...edge,
    label: `${edge.label}${edge.technology ? ` [${edge.technology}]` : ''}`, selected: edge.id === edgeId,
    markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, labelStyle: { fontSize: 12 } }));
  const update = (patch: Partial<C4Node>) => onChangeNodes(nodes.map(node => node.id === selectedId ? { ...node, ...patch } : node));
  const remove = (ids: string[]) => {
    const remaining = removeC4Nodes(nodes, ids);
    const remainingIds = new Set(remaining.map(node => node.id));
    onChangeNodes(remaining);
    onChangeRelationships(relationships.filter(edge => remainingIds.has(edge.source) && remainingIds.has(edge.target)));
  };
  const addNode = () => {
    const parent = parentKind[newKind] ? (scope?.kind === parentKind[newKind] ? scope : nodes.find(node => node.kind === parentKind[newKind])) : undefined;
    if (parentKind[newKind] && !parent) return;
    const id = crypto.randomUUID();
    onChangeNodes([...nodes, { id, kind: newKind, label: t('c4.newElement'), category: newKind,
      description: '', technology: '', expectedPath: '', parentId: parent?.id ?? null,
      x: (visible.length % 3) * 310, y: Math.floor(visible.length / 3) * 240 }]);
    setLevel(newKind === 'person' ? 'system' : newKind);
    setDesignTab(newKind === 'person' ? 'system' : newKind);
    setScopeId(parent?.id || ''); setSelectedId(id); setEdgeId('');
  };
  const field = (label: string, content: ReactNode) => <label className="block space-y-1 text-xs text-slate-600 dark:text-slate-300"><span>{label}</span>{content}</label>;
  return <div className="space-y-5">
    <div className={panelClass}>
      <h3 className="font-bold text-slate-900 dark:text-white">{t('c4.title')}</h3>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('workspace.tabs.design')}>
        <button type="button" role="tab" id="design-tab-readme" aria-controls="design-panel-readme" aria-selected={designTab === 'readme'} onClick={() => setDesignTab('readme')} className={`rounded-lg px-3 py-2 text-sm ${designTab === 'readme' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>README.md</button>
        {(['system', 'container', 'component', 'code'] as C4Kind[]).map((kind, i) => <button key={kind} type="button" role="tab" id={`design-tab-${kind}`} aria-controls="design-panel-diagram" aria-selected={designTab === kind}
          onClick={() => { setDesignTab(kind); setLevel(kind); setScopeId(''); setSelectedId(''); setEdgeId(''); }}
          className={`rounded-lg px-3 py-2 text-sm ${designTab === kind ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
          C{i + 1} · {['Context', 'Container', 'Component', 'Code'][i]}</button>)}
      </div>
    </div>
    {designTab === 'readme' ? <div role="tabpanel" id="design-panel-readme" aria-labelledby="design-tab-readme" className={panelClass}>
      {field(t('c4.designDoc'), <textarea rows={22} className={`${fieldClass} font-mono`} value={designDoc} onChange={event => onChangeDesignDoc(event.target.value)} />)}
    </div> : <div role="tabpanel" id="design-panel-diagram" aria-labelledby={`design-tab-${designTab}`} className="space-y-5">
    <div className={panelClass}>
      <p className="text-xs text-slate-500 dark:text-slate-300">{t('c4.levelsDescription')}</p>
      {level !== 'system' && field(t('c4.scope'), <select className={fieldClass} value={scope?.id || ''} onChange={event => { setScopeId(event.target.value); setSelectedId(''); }}>
        {!scopes.length && <option value="">{t('c4.createParentFirst')}</option>}
        {scopes.map(node => <option key={node.id} value={node.id}>{node.label} [{node.kind}]</option>)}
      </select>)}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="border-b p-3 text-xs text-slate-600">{scope && level !== 'system' ? `${scope.label} / ${level}` : 'System Context'} · {t('c4.canvasInstructions')}</div>
        <div style={{ height: 600 }}>
          <ReactFlow<FlowNode> key={`${level}-${scope?.id || ''}`} nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} fitView minZoom={0.15} maxZoom={2}
            onNodeClick={(_, node) => { setSelectedId(node.id); setEdgeId(''); }}
            onEdgeClick={(_, edge) => { setEdgeId(edge.id); setSelectedId(''); }}
            onNodesChange={changes => {
              const positions = new Map(changes.flatMap(change => change.type === 'position' && change.position ? [[change.id, change] as const] : []));
              if (positions.size) onChangeNodes(nodes.map(node => { const change = positions.get(node.id); return change?.type === 'position' && change.position ? { ...node, x: change.position.x, y: change.position.y } : node; }));
            }}
            onNodesDelete={deleted => remove(deleted.map(node => node.id))}
            onEdgesDelete={deleted => onChangeRelationships(relationships.filter(edge => !deleted.some(item => item.id === edge.id)))}
            isValidConnection={connection => connection.source !== connection.target && !relationships.some(edge => edge.source === connection.source && edge.target === connection.target)}
            onConnect={connection => { const id = crypto.randomUUID(); onChangeRelationships([...relationships, { id, source: connection.source, target: connection.target, label: t('c4.uses'), technology: '' }]); setEdgeId(id); setSelectedId(''); }}>
            <Background gap={24} /><Controls /><MiniMap nodeColor={node => colors[(node.data as FlowNode['data']).kind]} pannable zoomable />
          </ReactFlow>
        </div>
        {!visible.length && <p className="p-4 text-sm text-slate-600">{t('c4.emptyLevel')}</p>}
      </div>
      <aside className="space-y-4">
        <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{t('c4.addTitle')}</h4>
          {field(t('c4.elementType'), <select className={fieldClass} value={newKind} onChange={event => setNewKind(event.target.value as C4Kind)}>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select>)}
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40" onClick={addNode} disabled={!!parentKind[newKind] && !nodes.some(node => node.kind === parentKind[newKind])}>{t('c4.addElement')}</button>
          {parentKind[newKind] && !nodes.some(node => node.kind === parentKind[newKind]) && <p className="text-xs text-slate-500">{t('c4.parentRequired')} {parentKind[newKind]}</p>}
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
