import { Button } from '@/components/ui/button';
import { TypographyH3, TypographyP } from '@/components/ui/typography';
import Image from 'next/image';
import React, { memo, useEffect, useState } from 'react';
import {
  Position,
  Handle,
  type NodeProps,
} from 'reactflow';
import { Icons } from '@/components/icons';
import ReactMarkdown from 'react-markdown';

function L1Node({ data }: NodeProps<{
  title: string;
  text: string;
  expanded: boolean;
  isHighlighted: boolean;
  edgePoints: boolean[];
  questions?: string[];
  images?: string[];
}>) {
  console.log(data.images)
  const [isExpanded, setIsExpanded] = useState<boolean>(data.expanded);
  const [openQuestions, setOpenQuestions] = useState<boolean>(false);
  const MarkdownRenderer = (markdownText: string) => {
    return <ReactMarkdown>{markdownText}</ReactMarkdown>;
  };
  useEffect(() => {
    setIsExpanded(data.expanded);
  }, [data.expanded]);

  if (!isExpanded) {
    return (
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
        className={data.isHighlighted ? 'border-sky-500 border-2' : 'border-[#E0E0E0] border-2'}
      >
        <TypographyH3>{data.title}</TypographyH3>
        <div style={{ marginTop: 5 }}>
          {data.text.length > 100 ? `${data.text.substring(0, 100)}...` : data.text}
        </div>
        <Handle type={data.edgePoints[0] ? 'source' : 'target'} position={Position.Left} id="left" />
        <Handle type={data.edgePoints[1] ? 'source' : 'target'} position={Position.Bottom} id="bottom" />
        <Handle type={data.edgePoints[2] ? 'source' : 'target'} position={Position.Right} id="right" />
        <Handle type={data.edgePoints[3] ? 'source' : 'target'} position={Position.Top} id="top" />
        {data.isHighlighted && !openQuestions && (
          <>
            <Button
              variant="ghost"
              className="absolute -right-12 top-0 rounded-full border-2 text-gray-800 bg-[#F9F6F0] font-extrabold hover:bg-[#F9F6F0] hover:border-2 hover:border-gray-800"
              style={{ height: '40px', width: '40px', fontSize: '20px' }}
              onClick={() => setOpenQuestions(true)}
            >
              ?
            </Button>
            <Button
              variant="ghost"
              className="absolute -right-12 top-11 rounded-full border-2 text-gray-800 bg-[#F9F6F0] font-extrabold hover:bg-[#F9F6F0] hover:border-2 hover:border-gray-800"
              style={{ height: '40px', width: '40px' }}
              onClick={() => setIsExpanded(true)}
            >
              <Icons.search size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className="absolute -right-12 top-[88px] rounded-full border-2 text-gray-800 bg-[#F9F6F0] font-extrabold hover:bg-[#F9F6F0] hover:border-2 hover:border-gray-800"
              style={{ height: '40px', width: '40px' }}
              onClick={() => setIsExpanded(true)}
            >
              <Icons.expand size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5" />
            </Button>
          </>
        )}
        {data.isHighlighted && openQuestions && data.questions.length > 0 && (
          <>
            {data.questions.map((question, index) => {
              const angle = (index / (data.questions.length + 2)) * 2 * Math.PI;
              const radius = 300; // Adjust this value to change the circle size
              const top = Math.sin(angle) * radius;
              const left = Math.cos(angle) * radius;

              return (
                <Button
                  style={{
                    zIndex: 100,
                    position: 'absolute',
                    top: `calc(50% + ${top * 0.5}px)`,
                    left: `calc(50% + ${left * 1.25}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  key={index}
                  variant="ghost"
                  className="text-xs text-gray-800 bg-[#F9F6F0] w-[250px] border-2 border-[#E0E0E0] hover:bg-[#F9F6F0] hover:border-2 hover:border-gray-800"
                >
                  {question}
                </Button>
              );
            })}
            <Button
              style={{
                zIndex: 100,
                position: 'absolute',
                top: `calc(50% + ${Math.sin(((data.questions.length) / (data.questions.length + 2)) * 2 * Math.PI) * 250 * 0.5}px)`,
                left: `calc(50% + ${Math.cos(((data.questions.length) / (data.questions.length + 2)) * 2 * Math.PI) * 250 * 1.25}px)`,
                transform: 'translate(-50%, -50%)',
                width: '200px',
              }}
              variant="ghost"
              className="text-xs text-gray-800 bg-[#F9F6F0] min-w-[100px] hover:bg-[#F9F6F0] hover:border-2 hover:border-gray-800"
            >
              + Ask your own question
            </Button>
            <Button
              style={{
                zIndex: 100,
                position: 'absolute',
                top: `calc(50% + ${Math.sin(((data.questions.length + 1) / (data.questions.length + 2)) * 2 * Math.PI) * 250 * 0.5}px)`,
                left: `calc(50% + ${Math.cos(((data.questions.length + 1) / (data.questions.length + 2)) * 2 * Math.PI) * 250 * 1.25}px)`,
                transform: 'translate(-50%, -50%)',
                width: '200px',
              }}
              variant="destructive"
              className="text-xs min-w-[100px]"
              onClick={() => setOpenQuestions(false)}
            >
              Close
            </Button>
          </>
        )}
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
        className={data.isHighlighted ? 'border-sky-500 border-2' : 'border-[#E0E0E0] border-2'}
      >
        <div className="flex justify-between">
          <TypographyH3>{data.title}</TypographyH3>
          <Button variant="ghost" className="rounded-full text-gray-800 font-extrabold hover:bg-[#F9F6F0] hover:border-gray-800" onClick={() => setIsExpanded(false)}>
            <Icons.close size={24} className="w-5 h-5 mb-3" />
          </Button>
        </div>
        <div style={{ marginTop: 5 }} className="flex flex-col gap-4">
            {data.images && data.images.map((url) => (
              <Image key={url} src={url} alt={url} width={300} height={300} className="justify-center self-center" />
            ))}
          {MarkdownRenderer(data.text)}
        </div>

        <Handle type={data.edgePoints[0] ? 'source' : 'target'} position={Position.Left} id="left" />
        <Handle type={data.edgePoints[1] ? 'source' : 'target'} position={Position.Bottom} id="bottom" />
        <Handle type={data.edgePoints[2] ? 'source' : 'target'} position={Position.Right} id="right" />
        <Handle type={data.edgePoints[3] ? 'source' : 'target'} position={Position.Top} id="top" />
      </div>
    </div>
  );
}

export default memo(L1Node);
