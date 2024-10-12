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
import L1Node from './L1node';
import L0node from './L0node';

const nodeTypes = {
  L0: L0node,
  L1: L1Node,
};

const initialNodes: Node[] = [
  { id: '1', type: 'L1', position: { x: 0, y: 0 }, data: { title: 'Node 1', text: 'One day, while lounging beneath a tall oak tree, Felix overheard a conversation between two squirrels. They were chatting excitedly about a mysterious, enchanted maze deep in the heart of the forest. The rumor was that no animal had ever solved the maze and those who tried got lost forever, unable to escape its winding paths.', expanded: true, edgePoints: [false, true, true, false], questions: ['What is the name of the forest?', 'What is the name of the maze?', 'What is the name of the squirrels?', 'What is the name of the tree?'] } },
  { id: '2', type: 'L1', position: { x: 0, y: 0 }, data: { title: 'Node 2', text: 'Node 2', expanded: false, edgePoints: [false, true, true, false], questions: ['What is the name of the forest?', 'What is the name of the maze?', 'What is the name of the squirrels?'] } },
  { id: '3', type: 'L1', position: { x: 0, y: 0 }, data: { title: 'Node 3', text: 'Node 3', expanded: false, edgePoints: [false, true, true, false], questions: [] } },
  { id: '4', type: 'L0', position: { x: 0, y: 0 }, data: { title: 'Node 4', data: [{title: 'Column 1', rows: ['Row 1', 'Row 2', 'Row 3']}, {title: 'Column 2', rows: ['Row 4', 'Row 5', 'Row 6']}, {title: 'Column 3', rows: ['Row 7', 'Row 8', 'Row 9']}] } },
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
  const { setCenter, getNode, setViewport } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'default',
            markerEnd: {
              type: MarkerType.Arrow,
              width: 20,
              height: 20
            },
            style: {
              strokeWidth: 3,
            },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return { ...n, data: { ...n.data, isHighlighted: true } };
        }
        return { ...n, data: { ...n.data, isHighlighted: false } };
      }),
    );

    if ((event.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }

    // Get the position of the clicked node
    const nodeObj = getNode(node.id);
    if (nodeObj) {
      // Center the view on the clicked node
      setCenter(nodeObj.position.x, nodeObj.position.y, { zoom: 0.95, duration: 1500 });
    }
  }, [getNode, setCenter, setNodes]);

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
        onNodesChange={(changes) => {
          onNodesChange(changes);
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onNodeClick={handleNodeClick}
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
