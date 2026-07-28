import { parseTreeText } from "../parseTreeText";

describe("parseTreeText", () => {
  it("parses a simple root node", () => {
    const result = parseTreeText("Workspace [Workspace]");
    expect(result.ok).toBe(true);
    expect(result.document!.rootIds).toHaveLength(1);
    const root = result.document!.nodes[result.document!.rootIds[0]];
    expect(root.name).toBe("Workspace");
    expect(root.className).toBe("Workspace");
  });

  it("parses a nested tree", () => {
    const text = `Workspace [Workspace]
└── PackageRoot [Model]
    ├── PackageLink [PackageLink]
    ├── InnerPart [Part] (HistoryId=abc)
    └── InnerPart2 [Part] (HistoryId=def)`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const doc = result.document!;
    expect(doc.rootIds).toHaveLength(1);

    const root = doc.nodes[doc.rootIds[0]];
    expect(root.name).toBe("Workspace");
    expect(root.children).toHaveLength(1);

    const packageRoot = doc.nodes[root.children[0]];
    expect(packageRoot.name).toBe("PackageRoot");
    expect(packageRoot.className).toBe("Model");
    expect(packageRoot.children).toHaveLength(3);

    const innerPart = doc.nodes[packageRoot.children[1]];
    expect(innerPart.name).toBe("InnerPart");
    expect(innerPart.props).toEqual({ HistoryId: "abc" });
  });

  it("parses multiple roots", () => {
    const text = `Workspace [Workspace]
ServerStorage [ServerStorage]
ReplicatedStorage [ReplicatedStorage]`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    expect(result.document!.rootIds).toHaveLength(3);
  });

  it("parses duplicate names under same parent", () => {
    const text = `Workspace [Workspace]
└── Folder [Folder]
    ├── Part [Part]
    ├── Part [Part]
    └── Part [Part]`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const doc = result.document!;
    const folder = doc.nodes[doc.nodes[doc.rootIds[0]].children[0]];
    expect(folder.children).toHaveLength(3);
    const ids = new Set(folder.children);
    expect(ids.size).toBe(3);
  });

  it("parses properties with various types", () => {
    const text = `Node [Model] (AssetId=123, Version=5, Disabled=true, Label="hello, world", Empty=null)`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const node = result.document!.nodes[result.document!.rootIds[0]];
    expect(node.props).toEqual({
      AssetId: 123,
      Version: 5,
      Disabled: true,
      Label: "hello, world",
      Empty: null,
    });
  });

  it("parses quoted node names", () => {
    const text = `"Name With [brackets]" [Model]`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const node = result.document!.nodes[result.document!.rootIds[0]];
    expect(node.name).toBe("Name With [brackets]");
    expect(node.className).toBe("Model");
  });

  it("handles empty document", () => {
    const result = parseTreeText("");
    expect(result.ok).toBe(true);
    expect(result.document!.rootIds).toHaveLength(0);
  });

  it("handles comments", () => {
    const text = `# This is a comment
Workspace [Workspace]
# Another comment
└── Child [Part]`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    expect(result.document!.rootIds).toHaveLength(1);
    const root = result.document!.nodes[result.document!.rootIds[0]];
    expect(root.children).toHaveLength(1);
  });

  it("uses explicit ids when provided", () => {
    const text = `InnerPart [Part] (id=n_abc123, HistoryId=abc)`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const node = result.document!.nodes["n_abc123"];
    expect(node).toBeDefined();
    expect(node.name).toBe("InnerPart");
    expect(node.props).toEqual({ HistoryId: "abc" });
  });

  it("reports error on duplicate explicit ids", () => {
    const text = `Node1 [Part] (id=n_same)
Node2 [Part] (id=n_same)`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("DUPLICATE_ID");
  });

  it("parses node without class name", () => {
    const text = `SimpleNode`;
    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const node = result.document!.nodes[result.document!.rootIds[0]];
    expect(node.name).toBe("SimpleNode");
    expect(node.className).toBeUndefined();
  });

  it("parses deeply nested tree", () => {
    const text = `Root [Root]
└── A [A]
    └── B [B]
        └── C [C]
            └── D [D]`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const doc = result.document!;

    let current = doc.nodes[doc.rootIds[0]];
    const names = [current.name];
    while (current.children.length > 0) {
      current = doc.nodes[current.children[0]];
      names.push(current.name);
    }
    expect(names).toEqual(["Root", "A", "B", "C", "D"]);
  });

  describe("multiline notes (/* */)", () => {
    it("parses inline single-line note", () => {
      const text = `PackageLink [PackageLink]  /* overrides = { } */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.name).toBe("PackageLink");
      expect(node.note).toBe("overrides = { }");
    });

    it("parses inline multi-line note", () => {
      const text = `PackageLink [PackageLink]  /* overrides = {
    "01/03": { Color = Red },
    "01/04": { Type = Create },
} */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.note).toContain("overrides = {");
      expect(node.note).toContain('"01/03": { Color = Red },');
      expect(node.note).toContain("}");
    });

    it("parses standalone note block after node", () => {
      const text = `Part [Part]
    /* overrides = {
        ???
    } */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.name).toBe("Part");
      expect(node.note).toContain("overrides = {");
      expect(node.note).toContain("???");
    });

    it("preserves indentation within note", () => {
      const text = `Node [Model]  /* {
    key1: value1,
        nested: deep,
} */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      const lines = node.note!.split("\n");
      expect(lines[1]).toContain("    key1: value1,");
      expect(lines[2]).toContain("        nested: deep,");
    });

    it("does not break tree after note", () => {
      const text = `Workspace [Workspace]
└── PackageLink [PackageLink]  /* note */
    └── Child [Part]`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const doc = result.document!;
      const root = doc.nodes[doc.rootIds[0]];
      const pkg = doc.nodes[root.children[0]];
      expect(pkg.note).toBe("note");
      expect(pkg.children).toHaveLength(1);
      expect(doc.nodes[pkg.children[0]].name).toBe("Child");
    });

    it("does not break tree after multi-line note", () => {
      const text = `Workspace [Workspace]
├── PackageLink [PackageLink]  /* overrides = {
    "01/03": { Color = Red },
} */
├── Part [Part]
└── Model [Model]`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const doc = result.document!;
      const root = doc.nodes[doc.rootIds[0]];
      expect(root.children).toHaveLength(3);
      expect(doc.nodes[root.children[0]].name).toBe("PackageLink");
      expect(doc.nodes[root.children[1]].name).toBe("Part");
      expect(doc.nodes[root.children[2]].name).toBe("Model");
    });

    it("parses empty note", () => {
      const text = `Node [Part]  /* */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.note).toBe("");
    });

    it("does not treat /* inside quoted prop as note start", () => {
      const text = `Node [Part] (Path="/*foo*/")`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.note).toBeUndefined();
      expect(node.props.Path).toBe("/*foo*/");
    });

    it("handles note with tree connector characters in content", () => {
      const text = `Node [Part]  /* │├└── structure */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.note).toBe("│├└── structure");
    });

    it("note coexists with inline comment", () => {
      const text = `Node [Part]  // inline comment
    /* block note */`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      const node = result.document!.nodes[result.document!.rootIds[0]];
      expect(node.comment).toBe("inline comment");
      expect(node.note).toBe("block note");
    });
  });

  it("handles connector-only lines (visual separators)", () => {
    const text = `Workspace [Workspace]
│
└── PackageRoot [Model]
    ├── PackageLink [PackageLink]
    ├── InnerPart [Part]
    └── InnerPart2 [Part]`;

    const result = parseTreeText(text);
    expect(result.ok).toBe(true);
    const doc = result.document!;
    expect(doc.rootIds).toHaveLength(1);
    const root = doc.nodes[doc.rootIds[0]];
    expect(root.name).toBe("Workspace");
    expect(root.children).toHaveLength(1);
    const pkg = doc.nodes[root.children[0]];
    expect(pkg.name).toBe("PackageRoot");
    expect(pkg.children).toHaveLength(3);
  });

  describe("explicit id <id> placement", () => {
    it("parses <id> after the { } block", () => {
      const result = parseTreeText('Car [Model] { PathId = "01" } <car>');
      expect(result.ok).toBe(true);
      const node = result.document!.nodes["car"];
      expect(node).toBeDefined();
      expect(node.name).toBe("Car");
      expect(node.className).toBe("Model");
      expect(node.props).toEqual({ PathId: "01" });
    });

    it("parses <id> before the { } block (order-independent)", () => {
      const result = parseTreeText('Car [Model] <car> { PathId = "01" }');
      expect(result.ok).toBe(true);
      const node = result.document!.nodes["car"];
      expect(node).toBeDefined();
      expect(node.name).toBe("Car");
      expect(node.className).toBe("Model");
      // props must NOT be dropped when the id precedes the block
      expect(node.props).toEqual({ PathId: "01" });
    });

    it("keeps stable ids across nodes regardless of id/block order", () => {
      const text = `Car [Model] <car> { PathId = "01" }
└── Body [Part] { PathId = "03" } <body>`;
      const result = parseTreeText(text);
      expect(result.ok).toBe(true);
      expect(result.document!.nodes["car"]).toBeDefined();
      expect(result.document!.nodes["body"]).toBeDefined();
      expect(result.document!.nodes["car"].children).toEqual(["body"]);
    });
  });
});
