import React from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 150;
const nodeHeight = 40;

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? 'left' : 'top';
    node.sourcePosition = direction === 'LR' ? 'right' : 'bottom';

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes, edges };
};

export default function DependencyGraph({ relationships = [], viewFull = false }) {
    const categorizeFile = (path) => {
        const p = path.toLowerCase();
        if (p.includes('test')) return 'Tests';
        if (p.includes('frontend') || p.includes('src/components') || p.includes('src/pages') || p.includes('src/views')) {
            if (p.includes('service') || p.includes('api')) return 'Frontend Services';
            return 'Frontend UI';
        }
        if (p.includes('backend') || p.includes('server')) {
            if (p.includes('route') || p.includes('api')) return 'API Routes';
            if (p.includes('controller')) return 'Controllers';
            if (p.includes('service')) return 'Backend Services';
            if (p.includes('model') || p.includes('db') || p.includes('database')) return 'Database / Models';
            if (p.includes('middleware')) return 'Middleware';
            return 'Backend Core';
        }
        if (p.includes('service')) return 'Services';
        if (p.includes('route') || p.includes('api') || p.includes('controller')) return 'API / Controllers';
        if (p.includes('model') || p.includes('db')) return 'Database / Models';
        return 'Other';
    };

    const getNodeColor = (cat) => {
        if (cat.includes('UI')) return '#e0f2fe'; // blue
        if (cat.includes('Frontend Service')) return '#dcfce7'; // green
        if (cat.includes('API') || cat.includes('Route')) return '#dcfce7'; // green
        if (cat.includes('Controller')) return '#fef9c3'; // yellow
        if (cat.includes('Service')) return '#ffedd5'; // orange
        if (cat.includes('Database') || cat.includes('Model')) return '#dcfce7'; // green
        if (cat.includes('Test')) return '#fce7f3'; // pink
        return '#f1f5f9'; // slate
    };

    const getNodeBorder = (cat) => {
        if (cat.includes('UI')) return '#7dd3fc';
        if (cat.includes('Frontend Service')) return '#86efac';
        if (cat.includes('API') || cat.includes('Route')) return '#86efac';
        if (cat.includes('Controller')) return '#fde047';
        if (cat.includes('Service')) return '#fdba74';
        if (cat.includes('Database') || cat.includes('Model')) return '#86efac';
        if (cat.includes('Test')) return '#f9a8d4';
        return '#cbd5e1';
    };

    const initialNodes = [];
    const initialEdges = [];
    const [selectedNodeInfo, setSelectedNodeInfo] = React.useState(null);

    React.useEffect(() => {
        setSelectedNodeInfo(null);
    }, [viewFull]);

    // Graph Construction
    if (viewFull) {
        const nodeSet = new Set();
        const rels = relationships.slice(0, 100);

        rels.forEach((rel, i) => {
            if (!nodeSet.has(rel.source)) {
                nodeSet.add(rel.source);
                initialNodes.push({
                    id: rel.source,
                    data: { label: rel.source.split('/').pop() },
                    style: {
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#334155',
                        width: nodeWidth,
                        textAlign: 'center',
                        padding: '10px 0'
                    }
                });
            }
            if (!nodeSet.has(rel.target)) {
                nodeSet.add(rel.target);
                initialNodes.push({
                    id: rel.target,
                    data: { label: rel.target.split('/').pop() },
                    style: {
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#334155',
                        width: nodeWidth,
                        textAlign: 'center',
                        padding: '10px 0'
                    }
                });
            }
            initialEdges.push({
                id: `e${i}-${rel.source}-${rel.target}`,
                source: rel.source,
                target: rel.target,
                label: rel.type.replace('_', ' '),
                labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 500 },
                labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
                type: 'smoothstep',
                animated: rel.type === 'api_call',
                style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            });
        });
    } else {
        // Conceptual Graph
        const categories = {};
        const edgesMap = {};
        const fileToCategory = {};

        relationships.forEach(rel => {
            if (!fileToCategory[rel.source]) fileToCategory[rel.source] = categorizeFile(rel.source);
            if (!fileToCategory[rel.target]) fileToCategory[rel.target] = categorizeFile(rel.target);
        });

        Object.entries(fileToCategory).forEach(([file, cat]) => {
            if (!categories[cat]) {
                categories[cat] = { id: cat, label: cat, files: new Set(), dependsOnCategories: new Set(), importedByCategories: new Set() };
            }
            categories[cat].files.add(file);
        });

        relationships.forEach(rel => {
            const sourceCat = fileToCategory[rel.source];
            const targetCat = fileToCategory[rel.target];
            if (sourceCat && targetCat && sourceCat !== targetCat) {
                const edgeId = `${sourceCat}->${targetCat}`;
                if (!edgesMap[edgeId]) {
                    edgesMap[edgeId] = { source: sourceCat, target: targetCat, types: new Set(), count: 0, actualRelationships: [] };
                }
                edgesMap[edgeId].types.add(rel.type);
                edgesMap[edgeId].count++;
                edgesMap[edgeId].actualRelationships.push(rel);
                categories[sourceCat].dependsOnCategories.add(targetCat);
                categories[targetCat].importedByCategories.add(sourceCat);
            }
        });

        Object.values(categories).forEach(cat => {
            initialNodes.push({
                id: cat.id,
                data: { label: cat.label },
                style: {
                    background: getNodeColor(cat.id),
                    border: `2px solid ${getNodeBorder(cat.id)}`,
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1e293b',
                    width: nodeWidth,
                    textAlign: 'center',
                    padding: '10px 0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                },
                __catData: cat
            });
        });

        Object.values(edgesMap).forEach((edge, i) => {
            const typesArr = Array.from(edge.types);
            const mainType = typesArr.includes('api_call') ? 'api_call' : typesArr[0];
            initialEdges.push({
                id: `e${i}-${edge.source}-${edge.target}`,
                source: edge.source,
                target: edge.target,
                label: `${mainType.replace('_', ' ')} (${edge.count})`,
                labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600 },
                labelBgStyle: { fill: 'white', fillOpacity: 0.9, rx: 4, ry: 4 },
                type: 'smoothstep',
                animated: mainType === 'api_call',
                style: { stroke: '#94a3b8', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                __edgeData: edge
            });
        });
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        'TB'
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    React.useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = getLayoutedElements(initialNodes, initialEdges, 'TB');
        setNodes(newNodes);
        setEdges(newEdges);
    }, [viewFull, relationships]);

    const onNodeClick = React.useCallback((event, node) => {
        if (viewFull) {
            const depsOn = relationships.filter(r => r.source === node.id);
            const importedBy = relationships.filter(r => r.target === node.id);
            let type = 'Module';
            if (node.id.toLowerCase().includes('component')) type = 'Component';
            else if (node.id.toLowerCase().includes('route') || node.id.toLowerCase().includes('api')) type = 'Route/API';
            else if (node.id.toLowerCase().includes('controller')) type = 'Controller';
            else if (node.id.toLowerCase().includes('service')) type = 'Service';
            else if (node.id.toLowerCase().includes('model')) type = 'Model';
            
            setSelectedNodeInfo({
                id: node.id,
                name: node.id.split('/').pop(),
                type,
                files: [node.id],
                dependsOn: depsOn.map(r => ({ name: r.target.split('/').pop(), path: r.target, type: r.type })),
                importedBy: importedBy.map(r => ({ name: r.source.split('/').pop(), path: r.source, type: r.type }))
            });
        } else {
            const cat = node.__catData;
            if (!cat) return;
            const dependsOn = Array.from(cat.dependsOnCategories).map(c => ({ name: c, path: c, type: 'Category' }));
            const importedBy = Array.from(cat.importedByCategories).map(c => ({ name: c, path: c, type: 'Category' }));
            setSelectedNodeInfo({
                id: cat.id,
                name: cat.label,
                type: 'Conceptual Group',
                files: Array.from(cat.files),
                dependsOn,
                importedBy
            });
        }
    }, [relationships, viewFull]);

    if (relationships.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded-xl h-[300px]">
                <p className="text-sm text-slate-500 font-medium">No internal relationships detected.</p>
                <p className="text-xs text-slate-400 mt-2 text-center max-w-sm">
                    The scanner could not find explicit imports or API calls connecting the files in this repository.
                </p>
            </div>
        );
    }

    return (
        <div className="flex gap-6 items-start">
            <div style={{ height: '500px' }} className="flex-1 bg-slate-50 rounded-xl border border-slate-200 shadow-inner overflow-hidden relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    attributionPosition="bottom-right"
                    minZoom={0.5}
                    maxZoom={2}
                >
                    <Background color="#cbd5e1" gap={16} />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>
            
            {selectedNodeInfo && (
                <div className="w-80 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col" style={{ height: '500px' }}>
                    <div className="flex justify-between items-start mb-6 shrink-0">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900">Node Details</h4>
                            <p className="text-xs font-mono text-slate-500 mt-1 truncate max-w-[200px]" title={selectedNodeInfo.name}>{selectedNodeInfo.name}</p>
                        </div>
                        <button onClick={() => setSelectedNodeInfo(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    
                    <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-6">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Type</p>
                            <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md border border-indigo-100">
                                {selectedNodeInfo.type}
                            </span>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Files ({selectedNodeInfo.files.length})</p>
                            <ul className="space-y-1">
                                {selectedNodeInfo.files.slice(0, 10).map(f => (
                                    <li key={f} className="text-xs font-mono text-slate-700 truncate" title={f}>
                                        {f.split('/').pop()}
                                    </li>
                                ))}
                                {selectedNodeInfo.files.length > 10 && (
                                    <li className="text-xs text-slate-400 italic">+{selectedNodeInfo.files.length - 10} more</li>
                                )}
                            </ul>
                        </div>
                        
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Depends On ({selectedNodeInfo.dependsOn.length})</p>
                            <ul className="space-y-1">
                                {selectedNodeInfo.dependsOn.length > 0 ? selectedNodeInfo.dependsOn.map((r, i) => (
                                    <li key={i} className="text-xs font-mono text-slate-700 truncate" title={r.path}>
                                        → {r.name} <span className="text-[10px] text-slate-400">({r.type})</span>
                                    </li>
                                )) : <li className="text-xs text-slate-400 italic">None</li>}
                            </ul>
                        </div>
                        
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Imported By ({selectedNodeInfo.importedBy.length})</p>
                            <ul className="space-y-1">
                                {selectedNodeInfo.importedBy.length > 0 ? selectedNodeInfo.importedBy.map((r, i) => (
                                    <li key={i} className="text-xs font-mono text-slate-700 truncate" title={r.path}>
                                        ← {r.name} <span className="text-[10px] text-slate-400">({r.type})</span>
                                    </li>
                                )) : <li className="text-xs text-slate-400 italic">None</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
