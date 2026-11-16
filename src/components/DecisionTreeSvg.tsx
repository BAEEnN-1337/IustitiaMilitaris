import { useLanguage } from '../i18n/ui';
import { ui } from '../i18n/ui';
import React from 'react';
import { Scenario } from '../types';

interface DecisionTreeSvgProps {
  scenario: Scenario;
  currentNodeId?: string;
  visitedNodeIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  unreachableNodeIds?: string[];
}

export const DecisionTreeSvg: React.FC<DecisionTreeSvgProps> = ({
  scenario,
  currentNodeId,
  visitedNodeIds = [],
  onSelectNode,
  unreachableNodeIds = []
}) => {
  const lang = useLanguage();
  if (!scenario.vuzly || scenario.vuzly.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        {ui(lang, 'm27')}{' '}
      </div>
    );
  }

  // Calculate layers (stages) via BFS from pochatkovyi_vuzol
  const vuzlyMap = new Map(scenario.vuzly.map((v) => [v.id, v]));
  const levels: Record<string, number> = {};
  const queue: { id: string; lvl: number }[] = [];

  if (scenario.pochatkovyi_vuzol && vuzlyMap.has(scenario.pochatkovyi_vuzol)) {
    queue.push({ id: scenario.pochatkovyi_vuzol, lvl: 0 });
    levels[scenario.pochatkovyi_vuzol] = 0;
  }

  while (queue.length > 0) {
    const { id, lvl } = queue.shift()!;
    const node = vuzlyMap.get(id);
    if (!node || !node.varianty) continue;

    for (const v of node.varianty) {
      if (v.nastupnyi_vuzol && vuzlyMap.has(v.nastupnyi_vuzol)) {
        if (levels[v.nastupnyi_vuzol] === undefined) {
          levels[v.nastupnyi_vuzol] = lvl + 1;
          queue.push({ id: v.nastupnyi_vuzol, lvl: lvl + 1 });
        }
      }
    }
  }

  // Assign any unreachable nodes to level 99
  for (const node of scenario.vuzly) {
    if (levels[node.id] === undefined) {
      levels[node.id] = 99;
    }
  }

  // Group by level
  const levelGroups: Record<number, string[]> = {};
  for (const [nodeId, lvl] of Object.entries(levels)) {
    if (!levelGroups[lvl]) levelGroups[lvl] = [];
    levelGroups[lvl].push(nodeId);
  }

  const sortedLevels = Object.keys(levelGroups)
    .map(Number)
    .sort((a, b) => a - b);

  // Layout parameters
  const colWidth = 240;
  const rowHeight = 130;
  const nodeWidth = 170;
  const nodeHeight = 84;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  let maxCol = sortedLevels.length;
  let maxRow = 1;

  sortedLevels.forEach((lvl, colIdx) => {
    const nodesInLevel = levelGroups[lvl];
    maxRow = Math.max(maxRow, nodesInLevel.length);

    nodesInLevel.forEach((nodeId, rowIdx) => {
      const x = 40 + colIdx * colWidth;
      const y = 40 + rowIdx * rowHeight;
      nodePositions[nodeId] = { x, y };
    });
  });

  const svgWidth = Math.max(650, (maxCol + 1) * colWidth);
  const svgHeight = Math.max(260, (maxRow + 1) * rowHeight);

  // Edges
  const edges: {
    from: string;
    to: string;
    label: string;
    isVisited: boolean;
  }[] = [];
  for (const node of scenario.vuzly) {
    for (const v of node.varianty || []) {
      if (v.nastupnyi_vuzol && nodePositions[v.nastupnyi_vuzol]) {
        const isFromVisited = visitedNodeIds.includes(node.id);
        const isToVisited = visitedNodeIds.includes(v.nastupnyi_vuzol);
        edges.push({
          from: node.id,
          to: v.nastupnyi_vuzol,
          label: v.id,
          isVisited: isFromVisited && isToVisited
        });
      }
    }
  }

  return (
    <div className="w-full overflow-x-auto bg-navy-950/80 rounded-xl border border-navy-800 p-4">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="mx-auto block select-none"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="rgb(var(--slate-400))" />
          </marker>
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--graph-positive)" />
          </marker>
        </defs>
        {edges.map((e, idx) => {
          const fromPos = nodePositions[e.from];
          const toPos = nodePositions[e.to];
          if (!fromPos || !toPos) return null;

          const startX = fromPos.x + nodeWidth;
          const startY = fromPos.y + nodeHeight / 2;
          const endX = toPos.x;
          const endY = toPos.y + nodeHeight / 2;

          const midX = (startX + endX) / 2;
          const pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

          return (
            <g key={idx}>
              <path
                d={pathD}
                fill="none"
                stroke={
                  e.isVisited
                    ? 'var(--graph-positive)'
                    : 'rgb(var(--slate-500))'
                }
                strokeWidth={e.isVisited ? 2.5 : 1.5}
                markerEnd={e.isVisited ? 'url(#arrow-active)' : 'url(#arrow)'}
              />
              <text
                x={midX}
                y={(startY + endY) / 2 - 4}
                fill={
                  e.isVisited ? 'var(--graph-positive)' : 'var(--graph-ink)'
                }
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="bg-navy-950 px-1"
              >
                {e.label}
              </text>
            </g>
          );
        })}
        {scenario.vuzly.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const isCurrent = node.id === currentNodeId;
          const isVisited = visitedNodeIds.includes(node.id);
          const isUnreachable =
            unreachableNodeIds.includes(node.id) || levels[node.id] === 99;
          const isStart = node.id === scenario.pochatkovyi_vuzol;

          let strokeColor = 'rgb(var(--blue-400))';
          let fillColor = 'var(--graph-surface)';
          let textColor = 'var(--graph-ink)';

          if (isCurrent) {
            strokeColor = 'var(--graph-positive)';
            fillColor = 'rgba(16, 185, 129, 0.2)';
            textColor = 'var(--graph-positive)';
          } else if (isVisited) {
            strokeColor = 'var(--graph-positive)';
            fillColor = 'rgba(16, 185, 129, 0.1)';
            textColor = 'var(--graph-positive)';
          } else if (isUnreachable) {
            strokeColor = 'var(--graph-negative)';
            fillColor = 'rgba(239, 68, 68, 0.15)';
            textColor = 'var(--graph-negative)';
          } else if (isStart) {
            strokeColor = 'var(--graph-warning)';
            fillColor = 'rgba(245, 158, 11, 0.15)';
            textColor = 'var(--graph-warning)';
          }

          return (
            <g
              key={node.id}
              onClick={() => onSelectNode && onSelectNode(node.id)}
              className="cursor-pointer transition-transform hover:opacity-90"
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isCurrent ? 2.5 : 1.5}
                strokeDasharray={isUnreachable ? '4 2' : 'none'}
              />
              <foreignObject
                x={pos.x + 8}
                y={pos.y + 8}
                width={nodeWidth - 16}
                height={nodeHeight - 16}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode?.(node.id);
                  }}
                  style={{
                    color: textColor,
                    width: '100%',
                    height: '100%',
                    overflowY: 'auto',
                    overflowWrap: 'anywhere'
                  }}
                  className="text-xs text-center p-1 rounded focus-visible:outline focus-visible:outline-2"
                >
                  <strong className="block">{node.id}</strong>
                  <span className="block mt-1 text-slate-400">
                    {isStart
                      ? ui(lang, 'm28')
                      : isUnreachable
                        ? ui(lang, 'm29')
                        : ui(lang, 'm30', node.varianty?.length || 0)}
                  </span>
                </button>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
