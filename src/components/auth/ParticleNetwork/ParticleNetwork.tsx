import { useEffect, useRef } from "react";
import styles from "./ParticleNetwork.module.css";

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulseOffset: number;
}

const NODE_COUNT = 34;
const MAX_LINK_DISTANCE = 160;

// Canvas + requestAnimationFrame rather than DOM nodes or Framer Motion —
// the right tool for a many-node particle system (GPU-friendly, no React
// reconciliation per frame). Freezes to a single static frame under
// prefers-reduced-motion instead of animating indefinitely.
export default function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;

    function resize() {
      const parent = canvas!.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const nodes: NetworkNode[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let animationFrame: number;
    const startTime = performance.now();

    function draw(now: number) {
      ctx!.clearRect(0, 0, width, height);
      const elapsed = (now - startTime) / 1000;

      if (!prefersReducedMotion) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            const opacity = (1 - distance / MAX_LINK_DISTANCE) * 0.22;
            ctx!.strokeStyle = `rgba(165, 180, 252, ${opacity})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.stroke();
          }
        }
      }

      for (const node of nodes) {
        const pulse = prefersReducedMotion ? 0.6 : 0.5 + 0.5 * Math.sin(elapsed * 0.6 + node.pulseOffset);
        ctx!.fillStyle = `rgba(199, 210, 254, ${0.3 + pulse * 0.5})`;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, 1.6 + pulse * 1.2, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (!prefersReducedMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    }

    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
