import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Info, Activity } from 'lucide-react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import { api } from '@/services/api'

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 170, height: 60 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      targetPosition: 'left',
      sourcePosition: 'right',
      position: {
        x: nodeWithPosition.x - 85,
        y: nodeWithPosition.y - 30,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

export function PrerequisiteGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const threshold = 150

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.graph.getGraph()
        
        // Convert edges into React Flow format
        const rfEdges = data.edges.map((e: any) => ({
          ...e,
          animated: true,
          style: { stroke: 'var(--border-accent)', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' }
        }))

        // Map colors & styles based on backend nodes
        const rfNodes = data.nodes.map((n: any) => {
          // Systemic Impact Formula: Demand + (5.0 * Recursive Yield)
          // Average demand for bottleneck is 80. Threshold at 100 ensures high-impact courses bubble up.
          const impactScore = n.data.latent_demand + (5.0 * n.data.bottleneck_score)
          
          const isBottleneck = impactScore > threshold

          return {
            id: n.id,
            data: { 
              ...n.data,
              impactScore,
              isBottleneck
            },
            style: {
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: isBottleneck ? '2px solid var(--status-warning)' : '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: isBottleneck ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'var(--shadow-premium)',
              width: 170
            }
          }
        })

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges)

        setNodes(layoutedNodes)
        setEdges(layoutedEdges)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node)
  }, [])

  const bottlenecks = nodes.filter((n: any) => n.data.isBottleneck)

  return (
    <div className="p-10 space-y-8 h-full flex flex-col animate-fade-in relative z-10 pb-24 max-w-[1600px] mx-auto  ">
      {/* Header */}
      <div className="flex justify-between items-end pb-8 rounded-none">
        <div>
          <h1 className="text-3xl font-display font-bold text-main tracking-tight">Prerequisite Graph Topology</h1>
          <p className="text-muted text-sm mt-2 font-medium">Visualizing institutional course dependencies and systemic flow bottlenecks</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-muted uppercase tracking-widest bg-surface px-4 py-2 rounded-lg border border-premium shadow-sm">
          <Info className="w-4 h-4 text-[var(--brand-primary)]" />
          Interactive Graph
        </div>
      </div>

      {bottlenecks.length > 0 && (
        <div className="bg-[var(--status-error)]/10 border border-[var(--status-error)]/20 rounded-xl p-5 flex items-start gap-4 flex-none shadow-sm animate-in zoom-in-95 ">
          <div className="w-10 h-10 bg-[var(--status-error)]/10 rounded-lg flex items-center justify-center flex-none border border-[var(--status-error)]/20">
            <AlertTriangle className="w-5 h-5 text-[var(--status-error)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-main uppercase tracking-widest">Systemic Bottlenecks Detected</p>
            <p className="text-sm text-muted mt-1.5 font-medium leading-relaxed">
              The following courses exhibit high prerequisite pressure: 
              {bottlenecks.map((n, idx) => (
                <span key={n.id} className="font-mono font-bold mx-1 text-main bg-[var(--status-error)]/20 px-1.5 py-0.5 rounded italic">
                  {n.id}{idx < bottlenecks.length - 1 ? ',' : ''}
                </span>
              ))}
              — systemic flow analysis indicates these entities are critical for downstream degree progression.
            </p>
          </div>
        </div>
      )}

      {/* Main Graph Area */}
      <div className="flex-1 min-h-[600px] flex gap-8">
        <div className="flex-1 bg-surface rounded-xl border border-premium shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--brand-primary)] z-20" />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-right"
          >
            <Background color="var(--border-subtle)" gap={20} size={1} />
            <Controls className="!bg-surface !border-premium !shadow-md !fill-main" />
            <MiniMap 
              nodeColor={(n: any) => n.data?.isBottleneck ? 'var(--status-error)' : 'var(--brand-primary)'} 
              maskColor="var(--bg-main)"
              className="!border-premium !shadow-lg !bg-surface"
            />
          </ReactFlow>
        </div>

        <div className="w-80 flex-none space-y-6">
          <div className="bg-surface rounded-xl border border-premium shadow-sm p-6 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-sidebar/10" />
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--brand-primary)]" /> Entity Inspector
            </h3>
            
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-display font-bold text-2xl text-main tracking-tight">{selectedNode.data.course_code}</h4>
                  <p className="text-xs text-muted font-bold uppercase tracking-wider mt-1">{selectedNode.data.name}</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-4 rounded-md bg-[var(--brand-primary)] text-[10px] font-bold text-white uppercase tracking-widest shadow-lg shadow-[var(--brand-primary)]/20">
                    {selectedNode.data.type}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-premium space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Systemic Pressure</span>
                    <span className="text-lg font-bold text-main tabular-nums">{selectedNode.data.bottleneck_score} <span className="text-xs font-medium text-muted font-sans ml-1 text-right">courses blocked</span></span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Latent Demand</span>
                    <span className="text-lg font-bold text-main tabular-nums">{selectedNode.data.latent_demand} <span className="text-xs font-medium text-muted font-sans ml-1 text-right">students ready</span></span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-premium pt-4">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--brand-primary)] font-black">Final Impact Score</span>
                    <span className="text-2xl font-black text-[var(--brand-primary)] tabular-nums">{selectedNode.data.impactScore}</span>
                  </div>
                </div>

                {selectedNode.data.isBottleneck && (
                  <div className="mt-6 p-4 bg-[var(--status-error)]/10 rounded-lg text-[11px] text-[var(--status-error)] font-bold leading-relaxed border border-[var(--status-error)]/20 flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-none" />
                    <span>This entity is a critical systemic bottleneck (Score {'>'} {threshold}). Capacity expansion is mandatory for degree flow.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-400 font-medium italic">Select an institutional entity within the visualizer to audit metadata.</p>
              </div>
            )}
          </div>
          
          <div className="bg-[linear-gradient(135deg,var(--bg-sidebar)_0%,#1e1b4b_100%)] rounded-xl p-6 text-white shadow-xl border border-white/5 overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[var(--brand-primary)]/20 rounded-full blur-2xl group-hover:bg-[var(--brand-primary)]/40  " />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-4 opacity-80">Topology Legend</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[11px] font-bold text-white/90">
                <div className="w-3 h-3 rounded-sm bg-[var(--brand-primary)] shadow-[0_0_10px_rgba(99,102,241,0.5)] border border-white/20" />
                Standard Dependency
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-white/90">
                <div className="w-3 h-3 rounded-sm bg-[var(--status-error)] shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse border border-white/20" />
                Systemic Bottleneck
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

