"use client";

import { useMemo, useState } from "react";
import { EmployeeTreeNode } from "@/lib/types";
import Avatar from "@/components/Avatar";

const CARD_HEIGHT = 60;
const GAP = 8;
const ROW_STEP = CARD_HEIGHT + GAP;
const GUTTER_WIDTH = 40;

function countDescendants(node: EmployeeTreeNode): number {
  return node.reports.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function PersonCard({
  node,
  selected,
  onClick,
}: {
  node: EmployeeTreeNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: CARD_HEIGHT }}
      className={`w-64 flex items-center gap-3 rounded-lg border px-3 text-left transition-colors shrink-0 ${
        selected ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-border bg-surface hover:bg-canvas"
      }`}
    >
      <Avatar name={node.full_name} size={34} pictureUrl={node.picture_url} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink truncate">{node.full_name}</div>
        <div className="text-xs text-muted truncate">
          {node.position || node.role.replace("_", " ")}
          {node.department_name ? ` · ${node.department_name}` : ""}
        </div>
      </div>
    </button>
  );
}

function Connector({ selectedIndex, count }: { selectedIndex: number; count: number }) {
  const top = selectedIndex * ROW_STEP + CARD_HEIGHT / 2;
  return (
    <div className="relative shrink-0" style={{ width: GUTTER_WIDTH }}>
      <div className="absolute left-0 h-px bg-border" style={{ top, width: GUTTER_WIDTH / 2 }} />
      <div
        className="absolute flex items-center justify-center rounded-md bg-brand text-white text-[11px] font-semibold px-1.5"
        style={{ top, left: GUTTER_WIDTH / 2 - 12, transform: "translateY(-50%)", minWidth: 24, height: 18 }}
      >
        {count}
      </div>
      <div className="absolute right-0 h-px bg-border" style={{ top, width: GUTTER_WIDTH / 2 }} />
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
          const showConnector = depth < columns.length - 1 && selectedNode && selectedNode.reports.length > 0;

          return (
            <div key={depth} className="flex items-start">
              <div className="flex flex-col" style={{ gap: GAP }}>
                {col.map((node) => (
                  <PersonCard
                    key={node.id}
                    node={node}
                    selected={node.id === selectedId}
                    onClick={() => handleSelect(depth, node)}
                  />
                ))}
              </div>
              {showConnector && <Connector selectedIndex={selectedIndex} count={countDescendants(selectedNode!)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
