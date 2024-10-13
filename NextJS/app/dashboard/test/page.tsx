"use client";

import { Button } from '@/components/ui/button';
import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import L1Node from '../L1node';
import L0node from '../L0node';
import { createSession, pollApiUntilNItems, type SessionResponse, type ApiResponseItem } from '@/lib/api';

const nodeTypes = {
  L0: L0node,
  L1: L1Node,
};

const initialNodes: Node[] = [];

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [, setRfInstance] = useState<unknown>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null); // Track upload status

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const populatedNodeIds = useRef<Set<string>>(new Set()); // Keep track of populated nodes
  const usedItemIds = useRef<Set<string>>(new Set()); // Track used item ids

  // Trigger file input dialog when the button is clicked
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Function to create five "loading" nodes around the central node
  const createLoadingNodes = (hubId: string) => {
    const centerNode: Node = {
      id: 'center',
      type: 'L1',
      position: { x: 300, y: 300 },
      data: { title: `Hub: ${hubId}`, text: 'Central hub node', expanded: true, edgePoints: [false, true, true, false], questions: [] },
    };

    const radius = 150;
    const angleStep = (2 * Math.PI) / 5;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    for (let i = 0; i < 5; i++) {
      const angle = i * angleStep;
      const x = centerNode.position.x + radius * Math.cos(angle);
      const y = centerNode.position.y + radius * Math.sin(angle);

      const newNode: Node = {
        id: `node-${i + 1}`, // Each node has a unique ID
        type: 'L1',
        position: { x, y },
        data: { title: `Loading...`, text: '', expanded: true, edgePoints: [false, true, true, false], questions: [] },
      };

      const newEdge: Edge = {
        id: `edge-${i + 1}`,
        source: centerNode.id,
        target: newNode.id,
        type: 'default',
        markerEnd: {
          type: MarkerType.Arrow,
        },
        style: { strokeWidth: 2 },
      };

      newNodes.push(newNode);
      newEdges.push(newEdge);
    }

    setNodes([centerNode, ...newNodes]);
    setEdges(newEdges);
  };

  // Poll API to fetch nodes and update progressively
  const pollHubNodes = useCallback(async (hubId: string) => {
  const url = `http://localhost:8001/hubs/${hubId}/nodes`;

  // Callback to handle partial data updates
  const handlePartialResult = (items: ApiResponseItem[]) => {
  // Iterate over the new items, but only update one node per item
  items.forEach((item) => {
  console.log(item);

  if (!usedItemIds.current.has(item.id)) {
    console.log("not used");

    setNodes((nds) => {
      // Find all unpopulated nodes (nodes that still have 'Loading...')
      const unpopulatedIndices = nds
        .map((node, index) =>
          node.data.title === 'Loading...' && !populatedNodeIds.current.has(node.id) ? index : -1
        )
        .filter((index) => index !== -1); // Get valid indices

      console.log("Unpopulated nodes indices:", unpopulatedIndices);

      if (unpopulatedIndices.length > 0 && items.length > 0) {
        // We will only update the number of nodes equal to the number of items
        const updatedNodes = [...nds]; // Create a shallow copy of nodes
        const nonUsedItems = items.filter((item) => !usedItemIds.current.has(item.id));

        unpopulatedIndices.slice(0, nonUsedItems.length).forEach((unpopulatedIndex, i) => {
          const currentItem = nonUsedItems[i];

          if (currentItem) {
            // Update that specific node with the current item
            updatedNodes[unpopulatedIndex] = {
              ...updatedNodes[unpopulatedIndex],
              data: {
                ...updatedNodes[unpopulatedIndex].data,
                title: currentItem.title, // Update node title
                text: currentItem.text,   // Update node text
              },
            };

            // Mark the node as populated and the item as used
            populatedNodeIds.current.add(updatedNodes[unpopulatedIndex]?.id ?? '');
            usedItemIds.current.add(currentItem.id);
          }
        });

        return updatedNodes;
      }

      return nds; // Return original nodes if no unpopulated nodes found
    });
  }
});

};


  try {
    await pollApiUntilNItems(url, 5, handlePartialResult); // Pass the callback to handle partial data
  } catch (error) { /* empty */ }
}, [setNodes]);


  // Upload CSV and create session
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadSuccess(null);
      populatedNodeIds.current.clear(); // Clear previous populated node tracking

      try {
        const sessionResponse: SessionResponse = await createSession('http://localhost:8001/session/start', file);
        createLoadingNodes(sessionResponse.hub); // Create 5 "loading" nodes around the central hub node
        await pollHubNodes(sessionResponse.hub); // Start polling for the hub's nodes

        setUploadSuccess(true);
      } catch (error) {
        setUploadSuccess(false);
      } finally {
        setIsUploading(false);
      }
    }
  }, [pollHubNodes, setNodes]);

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

  return (
    <div style={{ width: '100%', height: '95vh', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        fitView
        fitViewOptions={{ padding: 2 }}
      >
        <Controls />
        <Background color="#000000" variant={BackgroundVariant.Cross} gap={12} size={1} />
      </ReactFlow>

      {nodes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(128, 128, 128, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}>
          <h1 style={{ fontSize: '24px', color: '#fff', marginBottom: '20px' }}>Upload a CSV to start</h1>

          <input
            type="file"
            ref={fileInputRef}  // Assign ref to the input
            accept=".csv"
            /* eslint-disable-next-line @typescript-eslint/no-misused-promises */
            onChange={handleFileUpload}
            disabled={isUploading}
            style={{ display: 'none' }} // Hide the file input
          />

          {isUploading ? (
            <p style={{ color: '#fff' }}>Uploading...</p>
          ) : uploadSuccess === true ? (
            <p style={{ color: '#00FF00' }}>Upload successful!</p>
          ) : uploadSuccess === false ? (
            <p style={{ color: '#FF0000' }}>Upload failed. Try again.</p>
          ) : (
            <Button onClick={triggerFileInput}>Upload CSV</Button>  // Use button to trigger file input
          )}
        </div>
      )}
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
