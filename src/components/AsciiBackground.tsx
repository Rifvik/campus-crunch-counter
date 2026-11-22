import { useEffect, useRef } from "react";
import bgPhoto from "@/assets/canteen-bg.jpg";

// "Herbarium" look: blurred photo backdrop + ordered-dither cells, warm soft-light tint,
// partial grayscale, contrast 115, bloom, vignette, animated ripple.
const CELL = 13;
const BAYER = [0, 0.5, 0.75, 0.25]; // 2x2 thresholds per cell
const TINT = "rgba(216,180,106,0.38)";

export function AsciiBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = bgPhoto;
    const sample = document.createElement("canvas");
    const sctx = sample.getContext("2d", { willReadFrequently: true })!;
    const bloom = document.createElement("canvas");
    const bctx = bloom.getContext("2d")!;
    let data: Uint8ClampedArray | null = null;
    let cols = 0,
      rows = 0,
      raf = 0,
      last = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cover = (c: CanvasRenderingContext2D, w: number, h: number) => {
      const s = Math.max(w / img.width, h / img.height);
      c.drawImage(
        img,
        (w - img.width * s) / 2,
        (h - img.height * s) / 2,
        img.width * s,
        img.height * s,
      );
    };

    const resize = () => {
      canvas.width = bloom.width = window.innerWidth;
      canvas.height = bloom.height = window.innerHeight;
      cols = Math.ceil(canvas.width / CELL);
      rows = Math.ceil(canvas.height / CELL);
      sample.width = cols;
      sample.height = rows;
      if (img.complete && img.width) {
        cover(sctx, cols, rows);
        data = sctx.getImageData(0, 0, cols, rows).data;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!data || now - last < 33) return;
      last = now;
      const t = now / 1000;
      const { width: w, height: h } = canvas;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#1c1712";
      ctx.fillRect(0, 0, w, h);
      ctx.filter = "blur(12px)";
      ctx.globalAlpha = 0.9;
      cover(ctx, w, h);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      const cx = w / 2,
        cy = h / 2,
        half = CELL / 2;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          let r = data[i]!,
            g = data[i + 1]!,
            b = data[i + 2]!;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r += (gray - r) * 0.28;
          g += (gray - g) * 0.28;
          b += (gray - b) * 0.28;
          r = (r - 128) * 1.15 + 128;
          g = (g - 128) * 1.15 + 128;
          b = (b - 128) * 1.15 + 128;
          const px = x * CELL,
            py = y * CELL;
          const d = Math.hypot(px - cx, py - cy);
          const wave = still ? 0 : Math.sin(d * 0.025 - t * 2.4) * 0.18 * 0.6;
          const lum = Math.min(1, Math.max(0, (0.299 * r + 0.587 * g + 0.114 * b) / 255 + wave));
          ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
          for (let k = 0; k < 4; k++)
            if (lum > BAYER[k]!)
              ctx.fillRect(px + (k & 1) * half, py + (k >> 1) * half, half - 1, half - 1);
        }
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = TINT;
      ctx.fillRect(0, 0, w, h);
      // bloom
      bctx.clearRect(0, 0, w, h);
      bctx.filter = "blur(10px) brightness(1.2)";
      bctx.drawImage(canvas, 0, 0);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.45 * 0.6;
      ctx.drawImage(bloom, 0, 0);
      // vignette
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const v = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.hypot(cx, cy));
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      if (still) cancelAnimationFrame(raf);
    };

    img.onload = resize;
    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
