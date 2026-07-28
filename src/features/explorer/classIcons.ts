type ClassIconDef = {
  svg: string;
  color: string;
};


function sphere(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="${color}"/><ellipse cx="7" cy="6.5" rx="3" ry="2.5" fill="rgba(255,255,255,0.25)"/></svg>`;
}

function cube(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="${color}"/><path d="M8 2L14 5.5L8 9L2 5.5L8 2Z" fill="rgba(255,255,255,0.2)"/><path d="M8 9V14L2 10.5V5.5L8 9Z" fill="rgba(0,0,0,0.15)"/></svg>`;
}

function folder(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M2 4C2 3.45 2.45 3 3 3H6.5L8 4.5H13C13.55 4.5 14 4.95 14 5.5V12C14 12.55 13.55 13 13 13H3C2.45 13 2 12.55 2 12V4Z" fill="${color}"/></svg>`;
}

function scroll(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><rect x="4" y="2" width="9" height="12" rx="1" fill="${color}"/><path d="M6 5H11M6 7.5H11M6 10H9" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/></svg>`;
}

function globe(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="${color}"/><ellipse cx="8" cy="8" rx="3" ry="6" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/><path d="M2.5 6H13.5M2.5 10H13.5" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/></svg>`;
}

function diamond(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2L14 8L8 14L2 8L8 2Z" fill="${color}"/></svg>`;
}

function link(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5L9.5 6.5M5.5 8L4 9.5C3.2 10.3 3.2 11.6 4 12.4C4.8 13.2 6.1 13.2 6.9 12.4L8.4 10.9M7.6 5.1L9.1 3.6C9.9 2.8 11.2 2.8 12 3.6C12.8 4.4 12.8 5.7 12 6.5L10.5 8" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function bolt(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M9 2L4 9H8L7 14L12 7H8L9 2Z" fill="${color}"/></svg>`;
}

function screen(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="8" rx="1" fill="${color}"/><path d="M6 13H10" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function person(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" fill="${color}"/><path d="M4 13C4 10.8 5.8 9 8 9C10.2 9 12 10.8 12 13" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function bulb(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2C5.5 2 3.5 4 3.5 6.5C3.5 8.2 4.5 9.6 6 10.3V12H10V10.3C11.5 9.6 12.5 8.2 12.5 6.5C12.5 4 10.5 2 8 2Z" fill="${color}"/><path d="M6.5 13H9.5" stroke="${color}" stroke-width="1" stroke-linecap="round"/></svg>`;
}

function gear(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" fill="none" stroke="${color}" stroke-width="1.5"/><path d="M8 1.5V3.5M8 12.5V14.5M1.5 8H3.5M12.5 8H14.5M3.1 3.1L4.5 4.5M11.5 11.5L12.9 12.9M12.9 3.1L11.5 4.5M4.5 11.5L3.1 12.9" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}

function squareOutline(color: string): string {
  return `<svg viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1.5" stroke="${color}" stroke-width="1.5"/></svg>`;
}

const CLASS_ICONS: Record<string, ClassIconDef> = {
  // Special: renders no icon (the 16px slot is still reserved, so tree
  // alignment is preserved). Use `[None]` for plain/iconless nodes.
  None: { svg: "", color: "#9cdcfe" },

  // Services
  Workspace: { svg: globe("#4ec9b0"), color: "#4ec9b0" },
  Camera: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="4.5" width="9" height="7" rx="1" fill="#9cdcfe"/><path d="M11 6.5L14 4.5V11.5L11 9.5" fill="#9cdcfe"/></svg>`, color: "#9cdcfe" },
  Terrain: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M2 12L5 6L8 9L11 4L14 12H2Z" fill="#6a9955"/></svg>`, color: "#6a9955" },
  Players: { svg: person("#569cd6"), color: "#569cd6" },
  Lighting: { svg: bulb("#dcdcaa"), color: "#dcdcaa" },
  MaterialService: { svg: diamond("#c586c0"), color: "#c586c0" },
  SoundService: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M3 6.5H5L8.5 3.5V12.5L5 9.5H3V6.5Z" fill="#9cdcfe"/><path d="M10.5 5.5C11.5 6.5 11.5 9.5 10.5 10.5M12 4C13.7 5.7 13.7 10.3 12 12" stroke="#9cdcfe" stroke-width="1" stroke-linecap="round"/></svg>`, color: "#9cdcfe" },
  ServerStorage: { svg: cube("#ce9178"), color: "#ce9178" },
  ServerScriptService: { svg: gear("#ce9178"), color: "#ce9178" },
  ReplicatedStorage: { svg: cube("#dcdcaa"), color: "#dcdcaa" },
  ReplicatedFirst: { svg: cube("#9cdcfe"), color: "#9cdcfe" },
  StarterGui: { svg: screen("#4ec9b0"), color: "#4ec9b0" },
  StarterPack: { svg: cube("#4ec9b0"), color: "#4ec9b0" },
  StarterPlayer: { svg: person("#4ec9b0"), color: "#4ec9b0" },

  // Common instances
  Model: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="6" height="6" rx="0.5" fill="#e06c45"/><rect x="9" y="2" width="5" height="5" rx="0.5" fill="#4a9eea"/><rect x="2" y="9" width="5" height="5" rx="0.5" fill="#4fc3f7"/><rect x="8" y="8" width="6" height="6" rx="0.5" fill="#f4b342"/></svg>`, color: "#e06c45" },
  Folder: { svg: folder("#dcdc8b"), color: "#dcdc8b" },
  Part: { svg: cube("#569cd6"), color: "#569cd6" },
  MeshPart: { svg: sphere("#7cacdf"), color: "#7cacdf" },
  UnionOperation: { svg: sphere("#8fbcbb"), color: "#8fbcbb" },
  SpawnLocation: { svg: sphere("#4ec9b0"), color: "#4ec9b0" },
  Baseplate: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="4" rx="0.5" fill="#6c7086"/><path d="M2 6L4 4H12L14 6" fill="#888"/></svg>`, color: "#6c7086" },

  // Scripts
  Script: { svg: scroll("#6a9955"), color: "#6a9955" },
  LocalScript: { svg: scroll("#569cd6"), color: "#569cd6" },
  ModuleScript: { svg: scroll("#c586c0"), color: "#c586c0" },

  // GUI
  Frame: { svg: squareOutline("#9cdcfe"), color: "#9cdcfe" },
  ScreenGui: { svg: screen("#4ec9b0"), color: "#4ec9b0" },
  TextLabel: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="9" rx="1" stroke="#9cdcfe" stroke-width="1"/><text x="8" y="10.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#9cdcfe">T</text></svg>`, color: "#9cdcfe" },
  TextButton: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="9" rx="1" fill="#4ec9b0" fill-opacity="0.2" stroke="#4ec9b0" stroke-width="1"/><text x="8" y="10.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#4ec9b0">T</text></svg>`, color: "#4ec9b0" },
  ImageLabel: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="9" rx="1" stroke="#9cdcfe" stroke-width="1"/><circle cx="5.5" cy="6" r="1.2" fill="#dcdcaa"/><path d="M3 11L6 8L8 10L10.5 7L13 11" fill="#6a9955" fill-opacity="0.5"/></svg>`, color: "#9cdcfe" },

  // Links
  PackageLink: { svg: link("#4ec9b0"), color: "#4ec9b0" },

  // Values
  StringValue: { svg: `<svg viewBox="0 0 16 16" fill="none"><text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="#ce9178">S</text></svg>`, color: "#ce9178" },
  IntValue: { svg: `<svg viewBox="0 0 16 16" fill="none"><text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="#b5cea8">#</text></svg>`, color: "#b5cea8" },
  NumberValue: { svg: `<svg viewBox="0 0 16 16" fill="none"><text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="#b5cea8">#</text></svg>`, color: "#b5cea8" },
  BoolValue: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8L6.5 11L12.5 5" stroke="#569cd6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`, color: "#569cd6" },
  ObjectValue: { svg: squareOutline("#9cdcfe"), color: "#9cdcfe" },
  Configuration: { svg: gear("#9cdcfe"), color: "#9cdcfe" },

  // Effects & physics
  RemoteEvent: { svg: bolt("#dcdcaa"), color: "#dcdcaa" },
  RemoteFunction: { svg: bolt("#4ec9b0"), color: "#4ec9b0" },
  BindableEvent: { svg: bolt("#ce9178"), color: "#ce9178" },
  PointLight: { svg: bulb("#dcdcaa"), color: "#dcdcaa" },
  SpotLight: { svg: bulb("#b5cea8"), color: "#b5cea8" },
  SurfaceLight: { svg: bulb("#9cdcfe"), color: "#9cdcfe" },
  ParticleEmitter: { svg: `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="1.5" fill="#dcdcaa"/><circle cx="5" cy="5" r="1" fill="#dcdcaa" opacity="0.6"/><circle cx="11" cy="5" r="1" fill="#dcdcaa" opacity="0.5"/><circle cx="4" cy="10" r="0.8" fill="#dcdcaa" opacity="0.4"/><circle cx="12" cy="10" r="0.8" fill="#dcdcaa" opacity="0.4"/><circle cx="8" cy="3" r="0.7" fill="#dcdcaa" opacity="0.3"/></svg>`, color: "#dcdcaa" },

  // Constraints & attachments
  Weld: { svg: `<svg viewBox="0 0 16 16" fill="none"><circle cx="5" cy="8" r="2" stroke="#6c7086" stroke-width="1.5" fill="none"/><circle cx="11" cy="8" r="2" stroke="#6c7086" stroke-width="1.5" fill="none"/><path d="M7 8H9" stroke="#6c7086" stroke-width="1.5"/></svg>`, color: "#6c7086" },
  Motor6D: { svg: `<svg viewBox="0 0 16 16" fill="none"><circle cx="5" cy="8" r="2" stroke="#6c7086" stroke-width="1.5" fill="none"/><circle cx="11" cy="8" r="2" stroke="#6c7086" stroke-width="1.5" fill="none"/><path d="M7 8H9" stroke="#6c7086" stroke-width="1.5"/><path d="M12 6L13 5" stroke="#6c7086" stroke-width="1"/></svg>`, color: "#6c7086" },
  Attachment: { svg: `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="#dcdcaa" stroke-width="1.5" fill="none"/><path d="M8 5V11M5 8H11" stroke="#dcdcaa" stroke-width="1"/></svg>`, color: "#dcdcaa" },

  // Humanoid & character
  Humanoid: { svg: person("#4ec9b0"), color: "#4ec9b0" },
  Tool: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M4 12L10 6M10.5 3.5C11.5 2.5 13 2.5 14 3.5C14.5 4.5 14 5.5 13 6.5L10 6L10.5 3.5Z" stroke="#dcdcaa" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>`, color: "#dcdcaa" },
  Animation: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M5 4L12 8L5 12V4Z" fill="#ce9178"/></svg>`, color: "#ce9178" },
  Animator: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M5 4L12 8L5 12V4Z" fill="#9cdcfe"/></svg>`, color: "#9cdcfe" },

  // Visual
  Decal: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1" fill="#dcdcaa" fill-opacity="0.3" stroke="#dcdcaa" stroke-width="1"/><circle cx="6" cy="6" r="1.5" fill="#dcdcaa"/></svg>`, color: "#dcdcaa" },
  Texture: { svg: `<svg viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1" fill="#6a9955" fill-opacity="0.3" stroke="#6a9955" stroke-width="1"/><path d="M3 8H13M8 3V13" stroke="#6a9955" stroke-width="0.5" opacity="0.5"/></svg>`, color: "#6a9955" },
  Beam: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M3 10C5 6 11 10 13 6" stroke="#c586c0" stroke-width="2" stroke-linecap="round"/></svg>`, color: "#c586c0" },
  Trail: { svg: `<svg viewBox="0 0 16 16" fill="none"><path d="M3 10C5 6 11 10 13 6" stroke="#4ec9b0" stroke-width="2" stroke-linecap="round"/></svg>`, color: "#4ec9b0" },
};

const DEFAULT_ICON: ClassIconDef = {
  svg: squareOutline("#9cdcfe"),
  color: "#9cdcfe",
};

export function getClassIcon(className?: string): ClassIconDef {
  if (!className) return DEFAULT_ICON;
  return CLASS_ICONS[className] ?? DEFAULT_ICON;
}
