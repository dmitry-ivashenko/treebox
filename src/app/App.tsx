import { EditModePage, editInstanceRef } from "../features/edit/EditModePage";
import { DiffPage } from "../features/diff/DiffPage";
import { TimelineModePage } from "../features/timeline/TimelineModePage";
import { AnimatePage } from "../features/animate/AnimatePage";
import { LibraryDialog } from "../features/library/LibraryDialog";
import { CommandPalette } from "../features/editor/CommandPalette";
import { ErrorRecovery } from "./ErrorRecovery";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";
import { useUrlShare } from "./useUrlShare";
import { useCommandPalette } from "./useCommandPalette";
import { useTreeboxStore, selectActiveTab } from "./store";

export default function App() {
  const { urlError, dismissUrlError } = useUrlShare();
  const activeTab = useTreeboxStore(selectActiveTab);
  const showLibrary = useTreeboxStore(s => s.showLibrary);
  const previewFullscreen = useTreeboxStore(s => s.previewFullscreen);
  const { isOpen: showPalette, close: closePalette } = useCommandPalette();

  const mode = activeTab?.activeMode ?? "edit";
  const importGen = useTreeboxStore(s => s.importGeneration);

  return (
    <div className={`app ${previewFullscreen ? "preview-fullscreen" : ""}`}>
      {!previewFullscreen && <TopBar />}
      {activeTab && mode === "edit" && <EditModePage key={`${activeTab.id}-${importGen}`} tabId={activeTab.id} />}
      {activeTab && mode === "diff" && <DiffPage key={`${activeTab.id}-${importGen}`} tabId={activeTab.id} />}
      {activeTab && mode === "timeline" && <TimelineModePage key={`${activeTab.id}-${importGen}`} tabId={activeTab.id} />}
      {activeTab && mode === "animate" && <AnimatePage key={`${activeTab.id}-${importGen}`} tabId={activeTab.id} />}
      {showLibrary && <LibraryDialog />}
      {!previewFullscreen && <StatusBar />}
      {showPalette && <CommandPalette onClose={closePalette} instance={editInstanceRef.current} />}
      {urlError && (
        <ErrorRecovery
          type="url"
          message={urlError}
          onDismiss={dismissUrlError}
          onReset={() => {
            localStorage.clear();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
