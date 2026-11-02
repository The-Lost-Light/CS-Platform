import { useState, type ReactNode } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType, type Node, type NodeProps } from '@xyflow/react';
import { useI18n } from '../../i18n';
import type { Analysis } from '../../types';
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

export function C4Architect({ nodes, onChangeNodes, relationships, onChangeRelationships, designDoc, onChangeDesignDoc, nodeEvaluations = [] }: {
  nodes: C4Node[]; onChangeNodes: (nodes: C4Node[]) => void;
  relationships: C4Relationship[]; onChangeRelationships: (edges: C4Relationship[]) => void;
  designDoc: string; onChangeDesignDoc: (doc: string) => void; nodeEvaluations?: Analysis['nodeEvaluations'];
}) {
  const { locale } = useI18n();
  const text = (zh: string, en: string) => locale === 'en' ? en : zh;
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
  const evaluation = new Map(nodeEvaluations.map(node => [node.id, node]));
  const flowNodes: FlowNode[] = visible.map(node => ({ id: node.id, type: 'c4', position: { x: node.x, y: node.y }, selected: node.id === selectedId,
    data: { title: node.label, kind: node.kind, description: node.description, technology: node.technology,
      status: node.expectedPath ? evaluation.get(node.id)?.statusLabel || node.expectedPath : '' } }));
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
    onChangeNodes([...nodes, { id, kind: newKind, label: text('新元素', 'New element'), category: newKind,
      description: '', technology: '', expectedPath: '', parentId: parent?.id ?? null,
      x: (visible.length % 3) * 310, y: Math.floor(visible.length / 3) * 240 }]);
    setLevel(newKind === 'person' ? 'system' : newKind);
    setScopeId(parent?.id || ''); setSelectedId(id); setEdgeId('');
  };
  const field = (label: string, content: ReactNode) => <label className="block space-y-1 text-xs text-slate-600 dark:text-slate-300"><span>{label}</span>{content}</label>;
  return <div className="space-y-5">
    <div className={panelClass}>
      <h3 className="font-bold text-slate-900 dark:text-white">{text('C4 model 架構設計', 'C4 model architecture')}</h3>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="C4 levels">
        {(['system', 'container', 'component', 'code'] as C4Kind[]).map((kind, i) => <button key={kind} role="tab" aria-selected={level === kind}
          onClick={() => { setLevel(kind); setScopeId(''); setSelectedId(''); setEdgeId(''); }}
          className={`rounded-lg px-3 py-2 text-sm ${level === kind ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
          C{i + 1} · {['Context', 'Container', 'Component', 'Code'][i]}</button>)}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">{text('C1 呈現使用者與系統；C2 展開系統內的應用程式與資料庫；C3 展開容器內元件；C4 描述元件內的類別與函式。', 'C1: people and systems. C2: applications and data stores within a system. C3: components within a container. C4: classes and functions within a component.')}</p>
      {level !== 'system' && field(text('檢視範圍／邊界', 'Scope / boundary'), <select className={fieldClass} value={scope?.id || ''} onChange={event => { setScopeId(event.target.value); setSelectedId(''); }}>
        {!scopes.length && <option value="">{text('請先建立上一層元素', 'Create a parent element first')}</option>}
        {scopes.map(node => <option key={node.id} value={node.id}>{node.label} [{node.kind}]</option>)}
      </select>)}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="border-b p-3 text-xs text-slate-600">{scope && level !== 'system' ? `${scope.label} / ${level}` : 'System Context'} · {text('拖曳節點移動，從右側接點連到左側接點建立有向關係。', 'Drag nodes to move; connect a right handle to a left handle to create a directed relationship.')}</div>
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
            onConnect={connection => { const id = crypto.randomUUID(); onChangeRelationships([...relationships, { id, source: connection.source, target: connection.target, label: text('使用', 'Uses'), technology: '' }]); setEdgeId(id); setSelectedId(''); }}>
            <Background gap={24} /><Controls /><MiniMap nodeColor={node => colors[(node.data as FlowNode['data']).kind]} pannable zoomable />
          </ReactFlow>
        </div>
        {!visible.length && <p className="p-4 text-sm text-slate-600">{text('此層級尚無元素，請在右側新增。', 'No elements at this level. Add one using the inspector.')}</p>}
      </div>
      <aside className="space-y-4">
        <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{text('新增 C4 元素', 'Add C4 element')}</h4>
          {field(text('元素類型', 'Element type'), <select className={fieldClass} value={newKind} onChange={event => setNewKind(event.target.value as C4Kind)}>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select>)}
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-40" onClick={addNode} disabled={!!parentKind[newKind] && !nodes.some(node => node.kind === parentKind[newKind])}>{text('新增元素', 'Add element')}</button>
          {parentKind[newKind] && !nodes.some(node => node.kind === parentKind[newKind]) && <p className="text-xs text-slate-500">{text('請先新增所屬的', 'First add a parent')} {parentKind[newKind]}</p>}
        </div>
        {selected && <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{text('編輯元素', 'Edit element')} · {selected.kind}</h4>
          {field(text('名稱', 'Name'), <input className={fieldClass} value={selected.label} onChange={event => update({ label: event.target.value })} />)}
          {parentKind[selected.kind] && field(text('所屬邊界', 'Parent boundary'), <select className={fieldClass} value={selected.parentId || ''} onChange={event => update({ parentId: event.target.value })}>{nodes.filter(node => node.kind === parentKind[selected.kind]).map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select>)}
          {field(text('技術', 'Technology'), <input className={fieldClass} value={selected.technology} onChange={event => update({ technology: event.target.value })} placeholder="React / REST / PostgreSQL" />)}
          {field(text('職責說明', 'Responsibilities'), <textarea className={fieldClass} value={selected.description} onChange={event => update({ description: event.target.value })} />)}
          {field(text('GitHub 路徑（選填）', 'GitHub path (optional)'), <input className={fieldClass} value={selected.expectedPath} onChange={event => update({ expectedPath: event.target.value })} placeholder="src/" />)}
          <button className="text-sm text-red-600" onClick={() => remove([selected.id])}>{text('刪除元素與其下層元素', 'Delete element and descendants')}</button>
        </div>}
        {selectedEdge && <div className={panelClass}>
          <h4 className="font-semibold dark:text-white">{text('編輯關係', 'Edit relationship')}</h4>
          <p className="text-xs text-slate-500">{nodes.find(node => node.id === selectedEdge.source)?.label} → {nodes.find(node => node.id === selectedEdge.target)?.label}</p>
          {field(text('關係描述', 'Relationship description'), <input className={fieldClass} value={selectedEdge.label} onChange={event => onChangeRelationships(relationships.map(edge => edge.id === edgeId ? { ...edge, label: event.target.value } : edge))} />)}
          {field(text('通訊技術／協定', 'Technology / protocol'), <input className={fieldClass} value={selectedEdge.technology} onChange={event => onChangeRelationships(relationships.map(edge => edge.id === edgeId ? { ...edge, technology: event.target.value } : edge))} />)}
          <button className="text-sm text-red-600" onClick={() => onChangeRelationships(relationships.filter(edge => edge.id !== edgeId))}>{text('刪除關係', 'Delete relationship')}</button>
        </div>}
      </aside>
    </div>
    <div className={panelClass}>{field(text('文字架構設計規格書', 'Architecture Design Document'), <textarea rows={12} className={`${fieldClass} font-mono`} value={designDoc} onChange={event => onChangeDesignDoc(event.target.value)} />)}</div>
  </div>;
}
