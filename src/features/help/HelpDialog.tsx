import { useState } from "react";

type Props = { onClose: () => void };

const TABS = ["DSL Syntax", "Edit", "Diff", "Timeline", "Animate"] as const;
type Tab = (typeof TABS)[number];

export function HelpDialog({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("DSL Syntax");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal help-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Help</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="help-tabs">
          {TABS.map(t => (
            <button key={t} className={`help-tab ${t === tab ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="help-content">
          {tab === "DSL Syntax" && <SyntaxHelp />}
          {tab === "Edit" && <EditHelp />}
          {tab === "Diff" && <DiffHelp />}
          {tab === "Timeline" && <TimelineHelp />}
          {tab === "Animate" && <AnimateHelp />}
        </div>
      </div>
    </div>
  );
}

function SyntaxHelp() {
  return (
    <div className="help-section">
      <h3>Basic Node</h3>
      <pre>{`NodeName [ClassName]`}</pre>
      <p>Each line defines a node. The class name in square brackets is optional.</p>

      <h3>Tree Structure</h3>
      <pre>{`Workspace [Workspace]
├── Players [Players]
│   └── Player1 [Player]
└── Lighting [Lighting]
    └── Sun [DirectionalLight]`}</pre>
      <p>Use Unicode box-drawing characters (├── └── │) or indentation (4 spaces per level) to define parent-child relationships.</p>

      <h3>Properties Block</h3>
      <pre>{`Part [Part] { Color = "Red", Size = 4, Anchored = true }`}</pre>
      <p>Properties go inside curly braces. Supported value types: strings (quoted), numbers, booleans (true/false), null.</p>

      <h3>Tags</h3>
      <pre>{`Player [Player] { #active, #team-blue }`}</pre>
      <p>Tags start with # inside the properties block. They are labels without values.</p>

      <h3>Attributes</h3>
      <pre>{`Script [Script] { @RunContext = "Server" }`}</pre>
      <p>Attributes start with @ and behave like properties but are visually distinguished.</p>

      <h3>Explicit Node ID</h3>
      <pre>{`Part [Part] <my-stable-id>`}</pre>
      <p>Angle brackets define an explicit node identity. IDs are used for tracking nodes across keyframes in animations and diffs. Without an explicit ID, one is generated automatically.</p>

      <h3>Comments</h3>
      <pre>{`Part [Part]  // this is a comment`}</pre>
      <p>Inline comments start with // after the node definition.</p>

      <h3>Notes (Multiline)</h3>
      <pre>{`Part [Part]  /* This is a note
that spans multiple lines */`}</pre>
      <p>Notes are wrapped in /* */. They appear as annotation lines below the node.</p>

      <h3>Display Status</h3>
      <pre>{`+ NewPart [Part]
~ ModifiedPart [Part]
- RemovedPart [Part]`}</pre>
      <p>Prefix a node with +, ~, or - to mark it as added, modified, or removed. Used primarily in diff mode.</p>

      <h3>Multiple Roots</h3>
      <pre>{`Workspace [Workspace]
ServerStorage [ServerStorage]
ReplicatedStorage [ReplicatedStorage]`}</pre>
      <p>Top-level nodes without indentation are all root nodes.</p>
    </div>
  );
}

function EditHelp() {
  return (
    <div className="help-section">
      <h3>Edit Mode</h3>
      <p>Create and edit a single tree document. The editor has two synchronized views:</p>
      <ul>
        <li><strong>Text Editor</strong> — write tree structure using the DSL syntax</li>
        <li><strong>Visual Explorer</strong> — interactive tree view with drag-and-drop</li>
      </ul>
      <p>Changes in either view immediately update the other.</p>

      <h3>Display Modes</h3>
      <ul>
        <li><strong>Split Vertical</strong> — text on the left, explorer on the right</li>
        <li><strong>Split Horizontal</strong> — text on top, explorer below</li>
        <li><strong>Code Only</strong> — full-width text editor</li>
        <li><strong>Visual Only</strong> — full-width explorer</li>
      </ul>

      <h3>Explorer Interactions</h3>
      <ul>
        <li>Click a node to select it</li>
        <li>Drag nodes to reorder or reparent them</li>
        <li>Right-click for context menu (add child, delete, duplicate)</li>
        <li>Double-click to rename</li>
      </ul>

      <h3>Toolbar Actions</h3>
      <ul>
        <li><strong>Copy</strong> — copy the full document text to clipboard</li>
        <li><strong>Paste</strong> — import from clipboard (auto-detects format)</li>
        <li><strong>Import file</strong> — load from .txt or .json file</li>
        <li><strong>Export TXT / JSON</strong> — download the document</li>
        <li><strong>Share</strong> — generate a shareable URL</li>
      </ul>
    </div>
  );
}

function DiffHelp() {
  return (
    <div className="help-section">
      <h3>Diff Mode</h3>
      <p>Compare two tree documents side by side. Differences are highlighted with colors:</p>
      <ul>
        <li><span style={{color: "#a6e3a1"}}>Green (+)</span> — added nodes</li>
        <li><span style={{color: "#f38ba8"}}>Red (-)</span> — removed nodes</li>
        <li><span style={{color: "#fab387"}}>Orange (~)</span> — modified nodes</li>
        <li><span style={{color: "#89b4fa"}}>Blue</span> — moved nodes</li>
      </ul>

      <h3>How It Works</h3>
      <p>Edit the "Before" tree on the left and the "After" tree on the right. The visual diff below updates automatically.</p>
      <p>Nodes are matched between trees using:</p>
      <ol>
        <li>Explicit IDs (if present)</li>
        <li>HistoryId property</li>
        <li>Structural matching (name + class + position)</li>
      </ol>

      <h3>Tips</h3>
      <ul>
        <li>Use explicit IDs (<code>&lt;id&gt;</code>) when you need precise tracking of renamed or moved nodes</li>
        <li>The diff preview can be viewed in fullscreen mode</li>
        <li>Copy/Paste works with the diff format: <code>--- Before ---</code> / <code>--- After ---</code></li>
      </ul>
    </div>
  );
}

function TimelineHelp() {
  return (
    <div className="help-section">
      <h3>Timeline Mode</h3>
      <p>Create a sequence of tree states and step through them. Useful for showing evolution of a structure over time.</p>

      <h3>How It Works</h3>
      <ul>
        <li>Each step is a full tree document</li>
        <li>Navigate between steps using the step controls</li>
        <li>The visual preview highlights what changed between steps</li>
      </ul>

      <h3>Adding Steps</h3>
      <p>Use the + button to add new steps. Each step starts as a copy of the previous one — then edit it to show the next state.</p>

      <h3>Text Format</h3>
      <pre>{`--- Step 1 ---
Workspace [Workspace]
└── Part [Part]

--- Step 2 ---
Workspace [Workspace]
├── Part [Part]
└── NewPart [Part]`}</pre>
      <p>This format is used by Copy/Paste and text export.</p>
    </div>
  );
}

function AnimateHelp() {
  return (
    <div className="help-section">
      <h3>Animate Mode</h3>
      <p>Create smooth animated transitions between tree states. Works like a video editor with keyframes on a timeline.</p>

      <h3>Keyframes</h3>
      <ul>
        <li>Each keyframe defines a tree state at a specific time</li>
        <li>The first keyframe is always at t=0 and cannot be moved</li>
        <li>Drag keyframe markers on the timeline to change timing</li>
        <li>Select a keyframe and edit the tree in the code editor</li>
        <li>Moving the playhead to an empty spot and editing creates a new keyframe</li>
      </ul>

      <h3>Timeline Controls</h3>
      <ul>
        <li><strong>Keyframe diamonds</strong> — click to select, drag to move</li>
        <li><strong>Duration handle</strong> — drag the right edge to extend/shrink</li>
        <li><strong>Zoom slider</strong> — adjust timeline zoom level</li>
        <li><strong>Label/Easing</strong> — set per-keyframe label and easing curve</li>
        <li><strong>Delete (✕)</strong> — delete the selected keyframe</li>
      </ul>

      <h3>Labels</h3>
      <p>Independent text labels that appear during playback:</p>
      <ul>
        <li>Double-click the label lane (below keyframe markers) to create a label</li>
        <li>Drag to move, drag edges to resize</li>
        <li>Double-click a label to edit its text</li>
        <li>Labels fade in and out automatically</li>
        <li>Labels cannot overlap in time</li>
      </ul>

      <h3>Animations</h3>
      <p>Between keyframes, nodes automatically animate:</p>
      <ul>
        <li><strong>Position</strong> — nodes move smoothly when reordered/reparented</li>
        <li><strong>Opacity</strong> — new nodes fade in, removed nodes fade out</li>
        <li><strong>Name</strong> — typewriter effect when names change</li>
        <li><strong>Comments</strong> — typewriter on appear, fade on disappear</li>
      </ul>

      <h3>Easing Options</h3>
      <ul>
        <li><strong>Ease In-Out</strong> — smooth start and end (default)</li>
        <li><strong>Ease In</strong> — starts slow, ends fast</li>
        <li><strong>Ease Out</strong> — starts fast, ends slow</li>
        <li><strong>Linear</strong> — constant speed</li>
      </ul>

      <h3>Node Identity</h3>
      <p>For animations to work correctly, nodes need stable IDs. Use explicit IDs (<code>&lt;id&gt;</code>) when nodes are renamed or moved between keyframes. The editor shows IDs automatically in animate mode.</p>

      <h3>Playback</h3>
      <ul>
        <li>Play/Pause, step between keyframes, seek to start/end</li>
        <li>Loop toggle and speed control (0.5x, 1x, 2x)</li>
        <li>Fullscreen mode with auto-hiding controls</li>
        <li>Click anywhere in fullscreen to show controls</li>
      </ul>

      <h3>Export</h3>
      <ul>
        <li><strong>Export GIF</strong> — renders the animation frame-by-frame and downloads as .gif</li>
        <li><strong>Export TXT</strong> — full text format with timings, IDs, and labels</li>
        <li><strong>Share</strong> — generates a URL that plays the animation on open</li>
        <li><strong>Copy</strong> — copies the full animation to clipboard</li>
      </ul>

      <h3>Text Format</h3>
      <pre>{`=== ANIMATION [duration=6, loop=true, speed=1] ===

--- Keyframe 1 [time=0, easing=ease-in-out] ---
Workspace [Workspace] <ws>
└── Part [Part] <p1>

--- Keyframe 2 [time=3, easing=ease-out] ---
Workspace [Workspace] <ws>
├── Part [Part] <p1>
└── NewPart [Part] <p2>

--- Labels ---
[1.0s - 2.5s] "Adding a part"`}</pre>
    </div>
  );
}
