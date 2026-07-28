import type { TreeboxDocument } from "../../core/model/types";
import type { TreeboxDiff } from "../../core/diff/diffTypes";

type Props = {
  diff: TreeboxDiff;
  left: TreeboxDocument;
  right: TreeboxDocument;
};

export function ChangeList({ diff, left, right }: Props) {
  const { summary, changes } = diff;

  return (
    <div className="change-list">
      <div className="change-summary">
        <span className="change-badge added">+{summary.added} added</span>
        <span className="change-badge removed">-{summary.removed} removed</span>
        <span className="change-badge changed">~{summary.changed} changed</span>
        <span className="change-badge moved">{summary.moved} moved</span>
      </div>
      <div className="change-items">
        {changes.map((change) => {
          let description = "";
          switch (change.type) {
            case "added": {
              const node = change.rightNodeId ? right.nodes[change.rightNodeId] : null;
              description = `+ ${node?.name ?? "?"} added at ${change.pathAfter}`;
              break;
            }
            case "removed": {
              const node = change.leftNodeId ? left.nodes[change.leftNodeId] : null;
              description = `- ${node?.name ?? "?"} removed from ${change.pathBefore}`;
              break;
            }
            case "renamed":
              description = `✎ Renamed: ${(change.details as Record<string, string>)?.from} → ${(change.details as Record<string, string>)?.to}`;
              break;
            case "classChanged":
              description = `~ Class changed: ${(change.details as Record<string, string>)?.from ?? "none"} → ${(change.details as Record<string, string>)?.to ?? "none"}`;
              break;
            case "propsChanged":
              description = `~ Properties changed at ${change.pathBefore ?? change.pathAfter}`;
              break;
            case "moved":
              description = `↪ Moved: ${change.pathBefore} → ${change.pathAfter}`;
              break;
            case "reordered":
              description = `↕ Reordered at ${change.pathAfter}`;
              break;
          }
          return (
            <div key={change.id} className={`change-item change-type-${change.type}`}>
              {description}
            </div>
          );
        })}
      </div>
    </div>
  );
}
