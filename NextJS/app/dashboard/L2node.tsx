import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { TypographyH3, TypographyP } from '@/components/ui/typography';
import React, { memo, useState } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import ReactMarkdown from 'react-markdown';

function L2Node({ data }: NodeProps<{
  title: string;
  text: string;
  expanded: boolean;
  isHighlighted: boolean;
  edgePoint: string;
}>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const edgeHandler = data.edgePoint === 'left' ? Position.Left : data.edgePoint === 'right' ? Position.Right : data.edgePoint === 'top' ? Position.Top : Position.Bottom;
  const MarkdownRenderer = (markdownText: string) => {
    return <ReactMarkdown>{markdownText}</ReactMarkdown>;
  };

  return (
    <div
      style={{
        background: '#998ede',
        color: '#222',
        padding: 10,
        fontSize: 12,
        borderRadius: 10,
        minWidth: 150,
        maxWidth: 350,
        transition: 'border-width 0.1s ease',
      }}
      className={data.isHighlighted ? 'border-[#E0E0E0] border-2' : 'border-gray-800 border-2'}
    >
      <TypographyH3>{data.title}</TypographyH3>
      {isExpanded && (
        <div style={{ marginTop: 5 }} className="flex flex-col gap-4">
          {MarkdownRenderer(data.text)}
        </div>
      )}
      {!isExpanded && (
        <div style={{ marginTop: 5 }} className="flex flex-col gap-4">
          {MarkdownRenderer(data.text.length > 200 ? `${data.text.substring(0, 200)}...` : data.text)}
        </div>
      )}
      <Handle type="target" position={edgeHandler} id={edgeHandler} />
      {data.isHighlighted && (
        <Button
          variant="ghost"
          className="absolute -right-12 top-0 rounded-full border-2 text-gray-800 bg-[#F9F6F0] font-extrabold hover:bg-[#F9F6F0] hover:border-2 hover:border-gray-800"
          style={{ height: '40px', width: '40px' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Icons.expand size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

export default memo(L2Node);
