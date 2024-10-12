"use client";

import { Button } from '@/components/ui/button';
import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TextNode from './generatednode';

const nodeTypes = {
  text: TextNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'text', position: { x: 0, y: 0 }, data: { title: 'Node 1', text: 'Node 1' } },
  { id: '2', type: 'text', position: { x: 0, y: 0 }, data: { title: 'Node 2', text: 'Node 2' } },
];

const flowKey = 'flow';

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>(initialNodes) as [
    Node[],
    React.Dispatch<React.SetStateAction<Node[]>>,
    (changes: NodeChange[]) => void
  ];
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]) as [
    Edge[],
    React.Dispatch<React.SetStateAction<Edge[]>>,
    (changes: EdgeChange[]) => void
  ];
  const [rfInstance, setRfInstance] = useState<any>(null);
  const { setViewport } = useReactFlow();

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'floating',
            markerEnd: { type: MarkerType.Arrow },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const handleDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const currentLabel = node.data?.label ?? 'No label';
    const newLabel = prompt('Enter new label:', currentLabel);
    if (newLabel !== null) {
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n))
      );
    }
  }, [setNodes]);

  const onSave = useCallback(() => {
    if (rfInstance && typeof rfInstance.toObject === 'function') {
      const flow = rfInstance.toObject();
      if (typeof flowKey === 'string') {
        localStorage.setItem(flowKey, JSON.stringify(flow));
      }
    }
  }, [rfInstance]);

  const onRestore = useCallback(() => {
    const restoreFlow = () => {
      if (typeof flowKey === 'string') {
        const storedFlow = localStorage.getItem(flowKey);
        if (storedFlow) {
          const flow = JSON.parse(storedFlow) as {
            nodes?: Node[];
            edges?: Edge[];
            viewport?: { x: number; y: number; zoom: number };
          };

          if (flow) {
            const { x = 0, y = 0, zoom = 1 } = flow.viewport ?? {};
            if (flow.nodes) setNodes(flow.nodes);
            if (flow.edges) setEdges(flow.edges);
            if (typeof setViewport === 'function') {
              setViewport({ x, y, zoom });
            }
          }
        }
      }
    };

    void restoreFlow();
  }, [setNodes, setEdges, setViewport]);

  return (
    <div style={{ width: '100%', height: '95vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onNodeDoubleClick={handleDoubleClick}
        fitView
        fitViewOptions={{ padding: 2 }}
        // nodesConnectable={false}
        // nodesDraggable={false}
      >
        <Panel position="top-right" className="flex gap-2">
          <Button onClick={onSave}>Save</Button>
          <Button onClick={onRestore}>Restore</Button>
        </Panel>
        <Controls />
        <Background color="#000000" variant={BackgroundVariant.Cross} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvasParent() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
