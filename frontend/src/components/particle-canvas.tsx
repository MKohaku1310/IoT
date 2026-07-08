import { useEffect, useRef } from "react";

export type ParticleMode = "snow" | "wind" | "stars" | "shimmer" | "mist";

export function ParticleCanvas({ modes }: { modes: ParticleMode[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modesRef = useRef(modes);
  modesRef.current = modes;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * dpr;
      h = canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; kind: string; seed?: number; rot?: number; rotV?: number };
    const particles: P[] = [];

    const spawn = () => {
      const active = new Set(modesRef.current);
      // SNOW — denser, larger flakes with drift
      if (active.has("snow")) {
        for (let k = 0; k < 3; k++) {
          if (Math.random() < 0.9)
            particles.push({
              x: Math.random() * w,
              y: -20,
              vx: (Math.random() - 0.5) * 1.4 * dpr,
              vy: (0.6 + Math.random() * 1.6) * dpr,
              r: (4 + Math.random() * 8) * dpr,
              a: 0.65 + Math.random() * 0.35,
              kind: "snow",
              seed: Math.random() * 1000,
              rot: Math.random() * Math.PI * 2,
              rotV: (Math.random() - 0.5) * 0.015,
            });
        }
      }
      // WIND — many streaks, faster
      if (active.has("wind")) {
        for (let k = 0; k < 2; k++) {
          if (Math.random() < 0.75)
            particles.push({
              x: -80 * dpr,
              y: Math.random() * h,
              vx: (6 + Math.random() * 9) * dpr,
              vy: (Math.random() - 0.5) * 0.6 * dpr,
              r: (60 + Math.random() * 140) * dpr,
              a: 0.22 + Math.random() * 0.25,
              kind: "wind",
            });
        }
        // small leaf-like specks
        if (Math.random() < 0.5)
          particles.push({
            x: -20 * dpr,
            y: Math.random() * h,
            vx: (8 + Math.random() * 6) * dpr,
            vy: (Math.random() - 0.5) * 1.2 * dpr,
            r: (2 + Math.random() * 3) * dpr,
            a: 0.5,
            kind: "leaf",
            seed: Math.random() * 1000,
          });
      }
      if (active.has("stars")) {
        const stars = particles.filter((p) => p.kind === "star").length;
        if (stars < 120)
          particles.push({ x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0, r: (0.5 + Math.random() * 1.8) * dpr, a: 0.3, kind: "star", seed: Math.random() * 1000 });
      }
      if (active.has("mist") && Math.random() < 0.35)
        particles.push({ x: Math.random() * w, y: h + 10, vx: (Math.random() - 0.5) * 0.3 * dpr, vy: -(0.2 + Math.random() * 0.4) * dpr, r: (3 + Math.random() * 6) * dpr, a: 0.3 + Math.random() * 0.25, kind: "mist" });
      if (active.has("shimmer") && Math.random() < 0.2)
        particles.push({ x: Math.random() * w, y: h * (0.1 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 0.3 * dpr, vy: -0.6 * dpr, r: (14 + Math.random() * 32) * dpr, a: 0.22, kind: "shimmer" });
    };

    // remove leftover particles for deactivated modes
    const pruneInactive = () => {
      const active = new Set(modesRef.current);
      for (let i = particles.length - 1; i >= 0; i--) {
        const kind = particles[i].kind;
        const need =
          (kind === "snow" && active.has("snow")) ||
          (kind === "wind" && active.has("wind")) ||
          (kind === "star" && active.has("stars")) ||
          (kind === "mist" && active.has("mist")) ||
          (kind === "shimmer" && active.has("shimmer"));
        if (!need) particles[i].a *= 0.9;
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      spawn();
      pruneInactive();
      const t = performance.now();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // snow drift wobble + rotation
        if (p.kind === "snow") {
          p.x += Math.sin(t / 700 + (p.seed ?? 0)) * 0.4 * dpr;
          if (p.rot !== undefined && p.rotV !== undefined) p.rot += p.rotV;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind === "star") p.a = 0.25 + (Math.sin(t / 500 + (p.seed ?? 0)) * 0.5 + 0.5) * 0.6;
        if (p.kind === "shimmer") p.a *= 0.985;
        if (p.kind === "mist") p.a *= 0.997;
        if (p.x > w + 200 * dpr || p.y > h + 20 * dpr || p.y < -80 * dpr || p.a < 0.02) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.min(1, p.a);
        if (p.kind === "snow") {
          const rot = p.rot ?? 0;
          const r = p.r;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(rot);
          // glow halo
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.8);
          g.addColorStop(0, "rgba(186,230,255,0.5)");
          g.addColorStop(1, "rgba(186,230,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
          ctx.fill();
          // draw 6-armed snowflake
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.lineWidth = Math.max(1, r * 0.22);
          ctx.lineCap = "round";
          for (let arm = 0; arm < 6; arm++) {
            ctx.save();
            ctx.rotate((arm * Math.PI) / 3);
            // main arm
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -r);
            ctx.stroke();
            // two branch pairs at 60% and 85% of arm length
            const branchAngles = [Math.PI / 5, -Math.PI / 5];
            const branchStarts = [r * 0.45, r * 0.72];
            const branchLens = [r * 0.38, r * 0.26];
            for (let b = 0; b < 2; b++) {
              for (const ang of branchAngles) {
                ctx.save();
                ctx.translate(0, -branchStarts[b]);
                ctx.rotate(ang);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -branchLens[b]);
                ctx.stroke();
                ctx.restore();
              }
            }
            ctx.restore();
          }
          // center dot
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.kind === "wind") {
          const g = ctx.createLinearGradient(p.x - p.r, p.y, p.x + p.r, p.y);
          g.addColorStop(0, "rgba(200,230,255,0)");
          g.addColorStop(0.5, "rgba(200,235,255,0.95)");
          g.addColorStop(1, "rgba(200,230,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = (1.5 + Math.random() * 1) * dpr;
          ctx.beginPath();
          ctx.moveTo(p.x - p.r, p.y);
          ctx.lineTo(p.x + p.r, p.y);
          ctx.stroke();
        } else if (p.kind === "leaf") {
          ctx.fillStyle = "rgba(134,239,172,0.75)";
          ctx.beginPath();
          const wob = Math.sin(t / 200 + (p.seed ?? 0)) * 3 * dpr;
          ctx.ellipse(p.x, p.y + wob, p.r * 1.6, p.r * 0.7, Math.sin(t / 300 + (p.seed ?? 0)), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "star") {
          ctx.fillStyle = "#fef9c3";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "mist") {
          ctx.fillStyle = "#bae6fd";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "shimmer") {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(255,170,80,0.6)");
          g.addColorStop(1, "rgba(255,170,80,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden />;
}
