import { Image as KonvaImage } from "react-konva";
import { useRef, useEffect } from "react";
import { useImage } from "../hooks/useImage";

export function DesignerImageElement({
  el,
  isSelected,
  onSelect,
  onChange,
}) {
  const img = useImage(el.url);
  const ref = useRef();

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.moveToTop();
    }
  }, [isSelected]);

  return (
    <KonvaImage
      ref={ref}
      id={el.id}
      image={img}
      x={el.x}
      y={el.y}
      scaleX={el.scaleX}
      scaleY={el.scaleY}
      rotation={el.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) =>
        onChange(el.id, {
          x: e.target.x(),
          y: e.target.y(),
        })
      }
      onTransformEnd={(e) => {
        const node = e.target;
        onChange(el.id, {
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
      }}
    />
  );
}
