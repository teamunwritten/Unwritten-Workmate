"use client";

import { useMemo, useState } from "react";
import { EmployeeTreeNode, roleLabel } from "@/lib/types";
import Avatar from "@/components/Avatar";

const CARD_HEIGHT = 60;
const GAP = 8;
const ROW_STEP = CARD_HEIGHT + GAP;
const GUTTER_WIDTH = 32;

function countDescendants(node: EmployeeTreeNode): number {
  return node.reports.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function ReportBadge({ count, selected }: { count: number; selected: boolean }) {
  if (count === 0) return null;
  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-md text-[11px] font-semibold px-1.5 border ${
        selected ? "bg-brand text-white border-brand" : "bg-surface text-muted border-border"
      }`}
      style={{ minWidth: 22, height: 18 }}
    >
      {count}
    </div>
  );
}

function PersonRow({
  node,
  selected,
  onClick,
}: {
  node: EmployeeTreeNode;
  selected: boolean;
  onClick: () => void;
}) {
  const reportCount = countDescendants(node);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: CARD_HEIGHT }}
      className={`w-64 flex items-center gap-2 rounded-lg border pl-3 pr-2 text-left transition-colors shrink-0 ${
        selected ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-border bg-surface hover:bg-canvas"
      }`}
    >
      <Avatar name={node.full_name} size={34} pictureUrl={node.picture_url} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink truncate">{node.full_name}</div>
        <div className="text-xs text-muted truncate">
          {node.position || roleLabel(node.role)}
          {node.department_name ? ` · ${node.department_name}` : ""}
        </div>
      </div>
      <ReportBadge count={reportCount} selected={selected} />
    </button>
  );
}

/** Elbow connector from the selected row to every row of the next column, matching a
 * Finder-style column browser: one tick out of the selected card, a vertical spine, then one
 * tick into each row of the next column. */
function Connector({ fromIndex, childCount }: { fromIndex: number; childCount: number }) {
  const fromY = fromIndex * ROW_STEP + CARD_HEIGHT / 2;
  const toYs = Array.from({ length: childCount }, (_, i) => i * ROW_STEP + CARD_HEIGHT / 2);
  const spineTop = Math.min(fromY, ...toYs);
  const spineHeight = Math.max(fromY, ...toYs) - spineTop;

  return (
    <div className="relative shrink-0" style={{ width: GUTTER_WIDTH }}>
      <div className="absolute bg-brand" style={{ top: fromY, left: 0, width: GUTTER_WIDTH / 2, height: 1.5 }} />
      <div className="absolute bg-brand" style={{ top: spineTop, left: GUTTER_WIDTH / 2, width: 1.5, height: spineHeight }} />
      {toYs.map((y, i) => (
        <div key={i} className="absolute bg-brand" style={{ top: y, left: GUTTER_WIDTH / 2, width: GUTTER_WIDTH / 2, height: 1.5 }} />
      ))}
    </div>
  );
}

export default function EmployeeTreeColumns({ roots }: { roots: EmployeeTreeNode[] }) {
  const [selectedPath, setSelectedPath] = useState<number[]>(() => (roots.length > 0 ? [roots[0].id] : []));

  const columns = useMemo(() => {
    const cols: EmployeeTreeNode[][] = [roots];
    let currentLevel = roots;
    for (const selectedId of selectedPath) {
      const selectedNode = currentLevel.find((n) => n.id === selectedId);
      if (!selectedNode || selectedNode.reports.length === 0) break;
      cols.push(selectedNode.reports);
      currentLevel = selectedNode.reports;
    }
    return cols;
  }, [roots, selectedPath]);

  function handleSelect(depth: number, node: EmployeeTreeNode) {
    setSelectedPath((prev) => [...prev.slice(0, depth), node.id]);
  }

  if (roots.length === 0) {
    return <div className="text-sm text-muted py-10 text-center">No employees found.</div>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start" style={{ minWidth: "max-content" }}>
        {columns.map((col, depth) => {
          const selectedId = selectedPath[depth];
          const selectedNode = col.find((n) => n.id === selectedId);
          const selectedIndex = col.findIndex((n) => n.id === selectedId);
          const nextColumn = columns[depth + 1];
          const showConnector = Boolean(selectedNode && nextColumn && nextColumn.length > 0);

          return (
            <div key={depth} className="flex items-start">
              <div className="flex flex-col" style={{ gap: GAP }}>
                {col.map((node) => (
                  <PersonRow key={node.id} node={node} selected={node.id === selectedId} onClick={() => handleSelect(depth, node)} />
                ))}
              </div>
              {showConnector && <Connector fromIndex={selectedIndex} childCount={nextColumn.length} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
