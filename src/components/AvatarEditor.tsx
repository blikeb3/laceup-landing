import React, { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  file: File;
  size?: number; // output square size in pixels
  onSave: (file: File) => void;
  onCancel: () => void;
}

const AvatarEditor: React.FC<Props> = ({ file, size = 400, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const baseScaleRef = useRef(1);
  const draggingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    imgRef.current = img;
    img.onload = () => {
      const iw = img.width;
      const ih = img.height;
      setImgSize({ w: iw, h: ih });
      const coverScale = Math.max(size / iw, size / ih);
      baseScaleRef.current = coverScale;
      setScale(coverScale);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    const url = URL.createObjectURL(file);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, size]);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, rotation, offset, size, imgSize]);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    const iw = img.width;
    const ih = img.height;
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !lastPosRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    lastPosRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleReset = () => {
    setScale(baseScaleRef.current);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const rotateBy = (delta: number) => {
    setRotation((prev) => {
      const next = prev + delta;
      if (next > 180) return next - 360;
      if (next < -180) return next + 360;
      return next;
    });
  };

  const zoomPercent = useMemo(
    () => Math.round((scale / baseScaleRef.current) * 100),
    [scale]
  );
  const minScale = useMemo(
    () => Math.max(baseScaleRef.current * 0.6, 0.1),
    [imgSize]
  );
  const maxScale = useMemo(
    () => Math.max(baseScaleRef.current * 2.2, 2),
    [imgSize]
  );

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const outFile = new File([blob], `avatar.png`, { type: "image/png" });
        onSave(outFile);
        resolve();
      }, "image/png");
    });
  };

  return (
    <div className="p-4">
      <div className="mb-2 text-sm text-muted-foreground">
        Drag to position your photo. Use the controls to zoom or rotate.
      </div>

      <div className="mb-3 flex items-center gap-3">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          className="rounded-full bg-muted border border-border cursor-grab active:cursor-grabbing"
          aria-label="Avatar preview"
        />
        <div className="text-xs text-muted-foreground">
          <div>Zoom: {zoomPercent}%</div>
          <div>Rotate: {rotation}°</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => rotateBy(-90)}
          className="px-3 py-1 rounded bg-muted border border-border text-sm"
        >
          Rotate left
        </button>
        <button
          type="button"
          onClick={() => rotateBy(90)}
          className="px-3 py-1 rounded bg-muted border border-border text-sm"
        >
          Rotate right
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 rounded bg-muted border border-border text-sm"
        >
          Reset
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm min-w-[48px]">Zoom</label>
        <input
          type="range"
          min={minScale}
          max={maxScale}
          step={0.01}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="flex-1"
          aria-label="Zoom"
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm min-w-[48px]">Rotate</label>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="flex-1"
          aria-label="Rotate"
        />
      </div>

      <div className="mb-3">
        <div className="text-xs text-muted-foreground">
          Tip: If the image looks cropped, increase the zoom or reset to fit.
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded bg-gray-200">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="px-3 py-1 rounded bg-blue-600 text-white">
          Save
        </button>
      </div>
    </div>
  );
};

export default AvatarEditor;
