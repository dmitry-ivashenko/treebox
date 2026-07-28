import { useEffect, useRef } from "react";
import { useTreeboxStore } from "../../app/store";
import { useTreeboxInstance } from "../../core/instance/useTreeboxInstance";
import { useGlobalUndo } from "../../app/useGlobalUndo";
import { ActiveInstanceProvider } from "../../core/instance/ActiveInstanceContext";
import { TreeboxPane } from "../treebox/TreeboxPane";
import type { TreeboxInstance } from "../../core/instance/types";

export const editInstanceRef: { current: TreeboxInstance | null } = { current: null };

type Props = { tabId: string };

export function EditModePage({ tabId }: Props) {
  const tab = useTreeboxStore(s => s.tabs.find(t => t.id === tabId));
  const updateEditState = useTreeboxStore(s => s.updateEditState);

  const editState = tab?.edit;
  const initialDoc = useRef(editState?.document).current;
  const initialText = useRef(editState?.textBuffer).current;

  const instance = useTreeboxInstance({
    initialDoc: initialDoc!,
    initialText: initialText ?? "",
    defaultDisplayMode: "split-v",
    instanceId: `edit-${tabId}`,
  });

  useGlobalUndo(instance);
  editInstanceRef.current = instance;

  useEffect(() => {
    updateEditState(tabId, {
      document: instance.doc,
      textBuffer: instance.textBuffer,
    });
  }, [instance.doc, instance.textBuffer, tabId, updateEditState]);

  return (
    <ActiveInstanceProvider instance={instance}>
      <div className="main-content">
        <TreeboxPane instance={instance} />
      </div>
    </ActiveInstanceProvider>
  );
}
