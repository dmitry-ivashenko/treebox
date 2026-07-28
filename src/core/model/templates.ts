export type Template = {
  id: string;
  title: string;
  description: string;
  text: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "roblox-package",
    title: "Roblox Package Tree",
    description: "A typical Roblox package structure with PackageLink",
    text: `Workspace [Workspace]
└── PackageRoot [Model] { #Package, @Version = 3 }
    ├── PackageLink [PackageLink] { AssetId = 123456 }
    ├── InnerPart [Part] { HistoryId = "abc" }
    ├── InnerPart2 [Part] { HistoryId = "def" }
    └── Scripts [Folder]
        ├── MainScript [Script]
        └── Config [ModuleScript]`,
  },
  {
    id: "roblox-game",
    title: "Roblox Game Structure",
    description: "Standard Roblox game services layout",
    text: `Workspace [Workspace]
├── Baseplate [Part] { Anchored = true }
├── SpawnLocation [SpawnLocation]
└── Map [Model]
    ├── Building1 [Model] { #Destructible }
    │   ├── Wall [Part]
    │   ├── Floor [Part]
    │   └── Roof [Part]
    └── Building2 [Model]
        ├── Wall [Part]
        └── Floor [Part]
ServerScriptService [ServerScriptService]
└── GameManager [Script]
ServerStorage [ServerStorage]
└── Assets [Folder]
    ├── Sword [Tool] { #Weapon, @Damage = 25 }
    └── Shield [Tool] { #Armor, @Defense = 10 }
ReplicatedStorage [ReplicatedStorage]
└── Shared [Folder]
    ├── Utils [ModuleScript]
    └── Config [ModuleScript]
StarterGui [StarterGui]
└── MainUI [ScreenGui]
    ├── HUD [Frame]
    └── Menu [Frame]
Lighting [Lighting]
Players [Players]`,
  },
  {
    id: "tagged-hierarchy",
    title: "Tags & Attributes Demo",
    description: "Demonstrates tags, attributes and ID capture",
    text: `World [Model]
├── Hero [Model] { #Character, #Destructible, @Health = 100, @Team = "Blue" } <hero>
│   ├── Body [MeshPart]
│   ├── Head [MeshPart]
│   └── Humanoid [Humanoid] { WalkSpeed = 16 }
├── Enemy [Model] { #Character, #Destructible, @Health = 50, @Team = "Red" } <enemy1>
│   ├── Body [MeshPart]
│   └── Humanoid [Humanoid] { WalkSpeed = 12 }
└── Pickups [Folder]
    ├── HealthPack [Part] { #Pickup, @HealAmount = 25 }
    └── SpeedBoost [Part] { #Pickup, @Duration = 5 }`,
  },
  {
    id: "filesystem",
    title: "Generic Filesystem",
    description: "Project directory structure",
    text: `src [Folder]
├── app [Folder]
│   ├── App [ModuleScript]
│   ├── store [ModuleScript]
│   └── routes [ModuleScript]
├── components [Folder]
│   ├── Header [ModuleScript]
│   ├── Sidebar [ModuleScript]
│   └── Footer [ModuleScript]
├── utils [Folder]
│   ├── api [ModuleScript]
│   ├── helpers [ModuleScript]
│   └── constants [Configuration]
└── assets [Folder]
    ├── images [Folder]
    └── styles [Folder]
tests [Folder]
├── unit [Folder]
└── e2e [Folder]
config [Folder]
├── env [Configuration]
└── webpack [Configuration]`,
  },
  {
    id: "diff-example",
    title: "Before/After (for Diff)",
    description: "Paste this in Diff mode to see structural changes",
    text: `Workspace [Workspace]
└── PackageRoot [Model]
    ├── PackageLink [PackageLink]
    ├── InnerPart [Part] { HistoryId = "abc", Color = "Really red" }
    ├── InnerPart2 [Part] { HistoryId = "def" }
    └── NewChild [Part] { HistoryId = "ghi" }`,
  },
];
