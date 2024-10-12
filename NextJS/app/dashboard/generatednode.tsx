import { TypographyH4 } from '@/components/ui/typography';
import React, { memo } from 'react';
import {
  Position,
  Handle,
  useReactFlow,
  type NodeProps,
} from 'reactflow';

function TextNode({ id, data }: NodeProps<{ title: string; text: string }>) {
  const { updateNodeData } = useReactFlow();

  return (
    <div
      style={{
        background: '#eee',
        color: '#222',
        padding: 10,
        fontSize: 12,
        borderRadius: 10,
      }}
    >
      <TypographyH4>{data.title}</TypographyH4>
      <div style={{ marginTop: 5 }}>
        <input
          onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
          value={data.text}
          style={{ display: 'block' }}
        />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(TextNode);
