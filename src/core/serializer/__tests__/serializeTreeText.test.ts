import { serializeTreeText } from "../serializeTreeText";
import { parseTreeText } from "../../parser/parseTreeText";
import type { TreeboxDocument } from "../../model/types";

describe("serializeTreeText", () => {
  it("serializes a simple root node", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Workspace", className: "Workspace", props: {}, children: [] },
      },
    });
    expect(serializeTreeText(doc)).toBe("Workspace [Workspace]");
  });

  it("serializes a nested tree with connectors", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Workspace", className: "Workspace", props: {}, children: ["n_2"] },
        n_2: { id: "n_2", name: "PackageRoot", className: "Model", props: {}, children: ["n_3", "n_4", "n_5"] },
        n_3: { id: "n_3", name: "PackageLink", className: "PackageLink", props: {}, children: [] },
        n_4: { id: "n_4", name: "InnerPart", className: "Part", props: { HistoryId: "abc" }, children: [] },
        n_5: { id: "n_5", name: "InnerPart2", className: "Part", props: { HistoryId: "def" }, children: [] },
      },
    });

    const expected = `Workspace [Workspace]
└── PackageRoot [Model]
    ├── PackageLink [PackageLink]
    ├── InnerPart [Part] { HistoryId = "abc" }
    └── InnerPart2 [Part] { HistoryId = "def" }`;

    expect(serializeTreeText(doc)).toBe(expected);
  });

  it("serializes multiple roots", () => {
    const doc = makeDoc({
      rootIds: ["n_1", "n_2", "n_3"],
      nodes: {
        n_1: { id: "n_1", name: "Workspace", className: "Workspace", props: {}, children: [] },
        n_2: { id: "n_2", name: "ServerStorage", className: "ServerStorage", props: {}, children: [] },
        n_3: { id: "n_3", name: "ReplicatedStorage", className: "ReplicatedStorage", props: {}, children: [] },
      },
    });

    const expected = `Workspace [Workspace]
ServerStorage [ServerStorage]
ReplicatedStorage [ReplicatedStorage]`;

    expect(serializeTreeText(doc)).toBe(expected);
  });

  it("serializes props preserving insertion order", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: {
          id: "n_1",
          name: "Package",
          className: "Model",
          props: { Version: 5, Zebra: "z", AssetId: 123, HistoryId: "abc" },
          children: [],
        },
      },
    });

    expect(serializeTreeText(doc)).toBe(
      'Package [Model] { Version = 5, Zebra = "z", AssetId = 123, HistoryId = "abc" }'
    );
  });

  it("quotes string values with special characters", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: {
          id: "n_1",
          name: "Part",
          className: "Part",
          props: { Label: "hello, world" },
          children: [],
        },
      },
    });

    expect(serializeTreeText(doc)).toBe('Part [Part] { Label = "hello, world" }');
  });

  it("is deterministic", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Root", className: "Model", props: { B: 2, A: 1 }, children: ["n_2"] },
        n_2: { id: "n_2", name: "Child", className: "Part", props: {}, children: [] },
      },
    });

    const a = serializeTreeText(doc);
    const b = serializeTreeText(doc);
    expect(a).toBe(b);
  });

  it("round-trips: parse → serialize → parse", () => {
    const text = `Workspace [Workspace]
└── PackageRoot [Model]
    ├── PackageLink [PackageLink]
    ├── InnerPart [Part] (HistoryId=abc)
    └── InnerPart2 [Part] (HistoryId=def)`;

    const result1 = parseTreeText(text);
    expect(result1.ok).toBe(true);

    const serialized = serializeTreeText(result1.document!);
    const result2 = parseTreeText(serialized);
    expect(result2.ok).toBe(true);

    const doc1 = result1.document!;
    const doc2 = result2.document!;

    expect(doc2.rootIds.length).toBe(doc1.rootIds.length);
    expect(Object.keys(doc2.nodes).length).toBe(Object.keys(doc1.nodes).length);

    for (const id of Object.keys(doc1.nodes)) {
      const n1 = doc1.nodes[id];
      const n2Candidates = Object.values(doc2.nodes).filter(
        (n) => n.name === n1.name && n.className === n1.className
      );
      expect(n2Candidates.length).toBeGreaterThan(0);
      const n2 = n2Candidates[0];
      expect(n2.props).toEqual(n1.props);
      expect(n2.children.length).toBe(n1.children.length);
    }
  });

  it("does not show class brackets when className is undefined", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "SimpleNode", props: {}, children: [] },
      },
    });
    expect(serializeTreeText(doc)).toBe("SimpleNode");
  });

  it("quotes names with reserved characters", () => {
    const doc = makeDoc({
      rootIds: ["n_1"],
      nodes: {
        n_1: { id: "n_1", name: "Name [special]", className: "Model", props: {}, children: [] },
      },
    });
    expect(serializeTreeText(doc)).toBe('"Name [special]" [Model]');
  });

  describe("multiline notes (/* */)", () => {
    it("serializes single-line note", () => {
      const doc = makeDoc({
        rootIds: ["n_1"],
        nodes: {
          n_1: { id: "n_1", name: "Node", className: "Part", props: {}, children: [], note: "hello" },
        },
      });
      expect(serializeTreeText(doc)).toBe("Node [Part]  /* hello */");
    });

    it("serializes multi-line note", () => {
      const doc = makeDoc({
        rootIds: ["n_1"],
        nodes: {
          n_1: { id: "n_1", name: "Node", className: "Part", props: {}, children: [], note: "overrides = {\n    ???\n}" },
        },
      });
      const output = serializeTreeText(doc);
      expect(output).toContain("/* overrides = {");
      expect(output).toContain("    ???");
      expect(output).toContain("} */");
    });

    it("roundtrip: inline single-line note", () => {
      const text = `Node [Part]  /* overrides = { } */`;
      const r1 = parseTreeText(text);
      expect(r1.ok).toBe(true);
      const serialized = serializeTreeText(r1.document!);
      const r2 = parseTreeText(serialized);
      expect(r2.ok).toBe(true);
      expect(r2.document!.nodes[r2.document!.rootIds[0]].note).toBe("overrides = { }");
    });

    it("roundtrip: inline multi-line note preserves content", () => {
      const text = `PackageLink [PackageLink]  /* overrides = {
    "01/03": { Color = Red },
} */`;
      const r1 = parseTreeText(text);
      expect(r1.ok).toBe(true);
      const note1 = r1.document!.nodes[r1.document!.rootIds[0]].note!;

      const serialized = serializeTreeText(r1.document!);
      const r2 = parseTreeText(serialized);
      expect(r2.ok).toBe(true);
      const note2 = r2.document!.nodes[r2.document!.rootIds[0]].note!;
      expect(note2).toBe(note1);
    });

    it("roundtrip: note + children together", () => {
      const text = `Workspace [Workspace]
└── Parent [Model]  /* parent note */
    └── Child [Part]`;
      const r1 = parseTreeText(text);
      expect(r1.ok).toBe(true);
      const doc1 = r1.document!;
      const parent1 = doc1.nodes[doc1.nodes[doc1.rootIds[0]].children[0]];
      expect(parent1.note).toBe("parent note");
      expect(parent1.children).toHaveLength(1);

      const serialized = serializeTreeText(doc1);
      const r2 = parseTreeText(serialized);
      expect(r2.ok).toBe(true);
      const doc2 = r2.document!;
      const parent2 = doc2.nodes[doc2.nodes[doc2.rootIds[0]].children[0]];
      expect(parent2.note).toBe("parent note");
      expect(parent2.children).toHaveLength(1);
    });

    it("roundtrip: note + comment together", () => {
      const doc = makeDoc({
        rootIds: ["n_1"],
        nodes: {
          n_1: { id: "n_1", name: "Node", className: "Part", props: {}, children: [], comment: "inline", note: "block" },
        },
      });
      const serialized = serializeTreeText(doc);
      expect(serialized).toContain("// inline");
      expect(serialized).toContain("/* block */");

      const r = parseTreeText(serialized);
      expect(r.ok).toBe(true);
      const node = r.document!.nodes[r.document!.rootIds[0]];
      expect(node.comment).toBe("inline");
      expect(node.note).toBe("block");
    });

    it("roundtrip: note + displayStatus together", () => {
      const doc = makeDoc({
        rootIds: ["n_1"],
        nodes: {
          n_1: { id: "n_1", name: "Node", className: "Part", props: {}, children: [], note: "info", displayStatus: "added" },
        },
      });
      const serialized = serializeTreeText(doc);
      const r = parseTreeText(serialized);
      expect(r.ok).toBe(true);
      const node = r.document!.nodes[r.document!.rootIds[0]];
      expect(node.note).toBe("info");
      expect(node.displayStatus).toBe("added");
    });
  });
});

function makeDoc(partial: {
  rootIds: string[];
  nodes: Record<string, { id: string; name: string; className?: string; props: Record<string, unknown>; children: string[]; comment?: string; note?: string; displayStatus?: string }>;
}): TreeboxDocument {
  const nodes: TreeboxDocument["nodes"] = {};
  for (const [id, n] of Object.entries(partial.nodes)) {
    nodes[id] = {
      id: n.id,
      name: n.name,
      className: n.className,
      props: n.props as Record<string, string | number | boolean | null>,
      children: n.children,
      ...(n.comment ? { comment: n.comment } : {}),
      ...(n.note ? { note: n.note } : {}),
      ...(n.displayStatus ? { displayStatus: n.displayStatus as "added" | "modified" | "removed" } : {}),
    };
  }
  return {
    schemaVersion: 1,
    id: "test-doc",
    title: "Test",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    rootIds: partial.rootIds,
    nodes,
    viewState: { expandedNodeIds: [] },
  };
}
