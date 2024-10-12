import { Button } from '@/components/ui/button';
import { TypographyH4 } from '@/components/ui/typography';
import React, { memo, useEffect, useState } from 'react';
import {
  Handle,
  Position,
  type NodeProps,
} from 'reactflow';
import { Icons } from '@/components/icons';

function L0Node({ data }: NodeProps<{
  title: string;
  expanded: boolean;
  data: {
    title: string;
    rows: string[] | number[];
  }[];
}>) {
  const [isExpanded, setIsExpanded] = useState<boolean>(data.expanded);

  useEffect(() => {
    setIsExpanded(data.expanded);
  }, [data.expanded]);

  if (!isExpanded) {
    return (
      <div
        style={{
          background: '#B36A5E',
          color: '#fff',
          padding: 10,
          fontSize: 12,
          borderRadius: 10,
          minWidth: 150,
          maxWidth: 500,
          transition: 'border-width 0.1s ease',
        }}
      >
        <TypographyH4>{data.title}</TypographyH4>

        <Handle type={'source'} position={Position.Left} id="left" />
        <Handle type={'source'} position={Position.Bottom} id="bottom" />
        <Handle type={'source'} position={Position.Right} id="right-target" />
        <Handle type={'source'} position={Position.Top} id="top-target" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        style={{
          background: '#F9F6F0',
          color: '#222',
          padding: 10,
          fontSize: 12,
          borderRadius: 10,
          minWidth: 150,
          maxWidth: 350,
          transition: 'border-width 0.1s ease',
        }}
      >
        <div className="flex justify-between">
          <TypographyH4>{data.title}</TypographyH4>
          <Button variant="ghost" className="rounded-full text-gray-800 font-extrabold hover:bg-[#F9F6F0] hover:border-gray-800" onClick={() => setIsExpanded(false)}>
            <Icons.close size={24} className="w-5 h-5 mb-3" />
          </Button>
        </div>
        <div style={{ marginTop: 5 }} className="flex flex-col gap-2">
          {data.data.map((item) => (
            <>
              <h4 key={item.title}>{item.title}</h4>
              {item.rows.map((row) => (
                <p key={row}>{row}</p>
              ))}
            </>
          ))}
        </div>

        <Handle type={'source'} position={Position.Left} id="left" />
        <Handle type={'source'} position={Position.Bottom} id="bottom" />
        <Handle type={'source'} position={Position.Right} id="right-target" />
        <Handle type={'source'} position={Position.Top} id="top-target" />
      </div>
    </div>
  );
}

export default memo(L0Node);
