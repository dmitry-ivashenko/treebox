import { useCallback, useRef } from "react";

type Props = {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
};

export function ResizableDivider({ direction, onResize }: Props) {
  const startPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = direction === "vertical" ? e.clientY : e.clientX;

    const handleMouseMove = (ev: MouseEvent) => {
      const current = direction === "vertical" ? ev.clientY : ev.clientX;
      const delta = current - startPos.current;
      startPos.current = current;
      onResize(delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = direction === "vertical" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
  }, [direction, onResize]);

  const className = direction === "vertical"
    ? "resizable-divider resizable-divider-h"
    : "resizable-divider resizable-divider-v";

  return <div className={className} onMouseDown={handleMouseDown} />;
}
