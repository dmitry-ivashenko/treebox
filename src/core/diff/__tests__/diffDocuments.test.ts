import { diffDocuments } from "../diffDocuments";
import type { TreeboxDocument } from "../../model/types";

function makeDoc(partial: {
  id?: string;
  rootIds: string[];
  nodes: Record<string, { id: string; name: string; className?: string; props?: Record<string, unknown>; children?: string[] }>;
}): TreeboxDocument {
  const nodes: TreeboxDocument["nodes"] = {};
  for (const [id, n] of Object.entries(partial.nodes)) {
    nodes[id] = {
      id: n.id,
      name: n.name,
      className: n.className,
      props: (n.props ?? {}) as Record<string, string | number | boolean | null>,
      children: n.children ?? [],
    };
  }
  return {
    schemaVersion: 1,
    id: partial.id ?? "doc-left",
    title: "Test",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    rootIds: partial.rootIds,
    nodes,
    viewState: { expandedNodeIds: [] },
  };
}

describe("diffDocuments", () => {
  it("detects no changes for identical documents", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Root", className: "Model", children: ["n_2"] },
        n_2: { id: "n_2", name: "Child", className: "Part" },
      },
    });
    const result = diffDocuments(doc, doc);
    expect(result.summary.added).toBe(0);
    expect(result.summary.removed).toBe(0);
    expect(result.summary.changed).toBe(0);
    expect(result.summary.moved).toBe(0);
  });

  it("detects added nodes", () => {
    const left = makeDoc({
      rootIds: ["n_1"],
      nodes: { n_1: { id: "n_1", name: "Root", className: "Model" } },
    });
    const right = makeDoc({
      id: "doc-right",
      rootIds: ["n_1", "n_2"],
      nodes: {
        n_1: { id: "n_1", name: "Root", className: "Model" },
        n_2: { id: "n_2", name: "NewNode", className: "Part" },
      },
    });
    const result = diffDocuments(left, right);
    expect(result.summary.added).toBe(1);
    expect(result.changes.find((c) => c.type === "added")!.rightNodeId).toBe("n_2");
  });

  it("detects removed nodes", () => {
    const left = makeDoc({
      rootIds: ["n_1", "n_2"],
      nodes: {
        n_1: { id: "n_1", name: "Root", className: "Model" },
        n_2: { id: "n_2", name: "Extra", className: "Part" },
      },
    });
    const right = makeDoc({
      id: "doc-right",
      rootIds: ["n_1"],
      nodes: { n_1: { id: "n_1", name: "Root", className: "Model" } },
    });
    const result = diffDocuments(left, right);
    expect(result.summary.removed).toBe(1);
  });

  it("detects renamed nodes", () => {
    const left = makeDoc({
      rootIds: ["n_1"],
      nodes: { n_1: { id: "n_1", name: "OldName", className: "Part" } },
    });
    const right = makeDoc({
      id: "doc-right",
      rootIds: ["n_1"],
      nodes: { n_1: { id: "n_1", name: "NewName", className: "Part" } },
    });
    const result = diffDocuments(left, right);
    expect(result.summary.changed).toBe(1);
    expect(result.nodePairs.find((p) => p.leftNodeId === "n_1")!.status).toBe("renamed");
  });

  it("detects property changes", () => {
    const left = makeDoc({
      rootIds: ["n_1"],
      nodes: { n_1: { id: "n_1", name: "Part", className: "Part", props: { Color: "Red" } } },
    });
    const right = makeDoc({
      id: "doc-right",
      rootIds: ["n_1"],
      nodes: { n_1: { id: "n_1", name: "Part", className: "Part", props: { Color: "Blue" } } },
    });
    const result = diffDocuments(left, right);
    expect(result.summary.changed).toBe(1);
    expect(result.changes.find((c) => c.type === "propsChanged")).toBeDefined();
  });

  it("detects moved nodes", () => {
    const left = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Root", children: ["n_2", "n_3"] },
        n_2: { id: "n_2", name: "Parent1", children: ["n_4"] },
        n_3: { id: "n_3", name: "Parent2" },
        n_4: { id: "n_4", name: "Moved" },
      },
    });
    const right = makeDoc({
      id: "doc-right",
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Root", children: ["n_2", "n_3"] },
        n_2: { id: "n_2", name: "Parent1" },
        n_3: { id: "n_3", name: "Parent2", children: ["n_4"] },
        n_4: { id: "n_4", name: "Moved" },
      },
    });
    const result = diffDocuments(left, right);
    expect(result.summary.moved).toBe(1);
    expect(result.nodePairs.find((p) => p.leftNodeId === "n_4")!.status).toBe("moved");
  });

  it("matches by HistoryId when IDs differ", () => {
    const left = makeDoc({
      rootIds: ["n_old"],
      nodes: { n_old: { id: "n_old", name: "Part", className: "Part", props: { HistoryId: "h1" } } },
    });
    const right = makeDoc({
      id: "doc-right",
      rootIds: ["n_new"],
      nodes: { n_new: { id: "n_new", name: "PartRenamed", className: "Part", props: { HistoryId: "h1" } } },
    });
    const result = diffDocuments(left, right);
    expect(result.summary.added).toBe(0);
    expect(result.summary.removed).toBe(0);
    expect(result.summary.changed).toBe(1);
    expect(result.nodePairs.find((p) => p.status === "renamed")).toBeDefined();
  });
});
