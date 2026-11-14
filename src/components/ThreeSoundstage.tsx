import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { MusicalKey } from '../types/music';

interface ThreeSoundstageProps {
  isPlaying: boolean;
  bpm: number;
  musicalKey: MusicalKey;
  /** User choice (WCAG 2.2.2): when true the scene shows one still frame and no loop runs. */
  paused?: boolean;
  /** Called once with true when WebGL started, false when it is unavailable. */
  onAvailable?: (ok: boolean) => void;
}

export const ThreeSoundstage: React.FC<ThreeSoundstageProps> = ({
  isPlaying,
  bpm,
  paused = false,
  onAvailable,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playingRef = useRef(isPlaying);
  const bpmRef = useRef(bpm);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  const onAvailableRef = useRef(onAvailable);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    onAvailableRef.current = onAvailable;
  }, [onAvailable]);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 11);

    // Decorative layer: if WebGL is unavailable the page simply renders without it.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onAvailableRef.current?.(false);
      return;
    }
    onAvailableRef.current?.(true);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Light-mode illumination for Silver & Royal Blue metallic geometry
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x2563eb, 1.8);
    directionalLight.position.set(5, 8, 6);
    scene.add(directionalLight);

    const silverLight = new THREE.PointLight(0x94a3b8, 1.2, 25);
    silverLight.position.set(-6, -3, 5);
    scene.add(silverLight);

    // Subtle Silver & Royal Blue Metallic Acoustic Rings
    const group = new THREE.Group();
    group.position.set(2.4, 0.2, -1.5);
    scene.add(group);

    const outerRingGeo = new THREE.TorusGeometry(2.6, 0.025, 24, 120);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Royal Blue (#2563EB)
      metalness: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: 0.28,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 3;
    group.add(outerRing);

    const innerRingGeo = new THREE.TorusGeometry(1.85, 0.02, 24, 100);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Brushed Silver (#94A3B8)
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.y = Math.PI / 4;
    group.add(innerRing);

    // Subtle Royal Blue (#2563EB) & Silver (#94A3B8) Acoustic Wave Particles
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const royalBlue = new THREE.Color('#2563EB');
    const silverSlate = new THREE.Color('#94A3B8');

    for (let i = 0; i < particleCount; i++) {
      const x = (i / particleCount) * 18 - 9;
      const y = Math.sin(i * 0.22) * 1.1;
      const z = (Math.random() - 0.5) * 3;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = i % 3 === 0 ? silverSlate : royalBlue;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
    });

    const particleWave = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleWave);

    let frameId = 0;
    let inView = true;
    let elapsed = 0;
    const clock = new THREE.Clock();

    const draw = () => {
      // Time only advances while the loop runs, so resuming never jumps.
      elapsed += Math.min(clock.getDelta(), 0.1);
      const activeSpeed = playingRef.current
        ? Math.max(1.1, bpmRef.current / 72)
        : 0.35;

      outerRing.rotation.z = elapsed * 0.15 * activeSpeed;
      innerRing.rotation.x = elapsed * 0.2 * activeSpeed;

      const posAttr = particlesGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        const baseX = posAttr.getX(i);
        const waveY =
          Math.sin(baseX * 0.55 + elapsed * activeSpeed * 1.4) *
          (playingRef.current ? 1.15 : 0.45);
        posAttr.setY(i, waveY);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    // Runs only when motion is allowed (OS setting + the visitor's pause button),
    // the tab is visible and the hero is on screen. Otherwise nothing is scheduled.
    const shouldRun = () => !reduceMotion && !pausedRef.current && inView && !document.hidden;
    const tick = () => {
      frameId = 0;
      draw();
      if (shouldRun()) frameId = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (shouldRun()) {
        if (!frameId) {
          clock.getDelta(); // discard the time spent paused
          frameId = requestAnimationFrame(tick);
        }
      } else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };
    syncRef.current = sync;

    draw(); // first frame is always drawn, so a paused scene is never blank
    sync();

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            inView = entries[0]?.isIntersecting ?? true;
            sync();
          })
        : null;
    observer?.observe(container);
    document.addEventListener('visibilitychange', sync);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.render(scene, camera); // resizing clears the canvas: redraw the current frame
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', sync);
      observer?.disconnect();
      syncRef.current = () => {};
      cancelAnimationFrame(frameId);
      outerRingGeo.dispose();
      outerRingMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full pointer-events-none select-none"
      aria-hidden="true"
    />
  );
};
