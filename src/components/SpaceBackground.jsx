import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function SpaceBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 20;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.04 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Floating rings
    const rings = [];
    const ringColors = [0x00e5ff, 0x7c3aed, 0x10b981];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.TorusGeometry(1.2 + i * 0.6, 0.01, 8, 80);
      const mat = new THREE.MeshBasicMaterial({ color: ringColors[i], transparent: true, opacity: 0.25 });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      scene.add(ring);
      rings.push(ring);
    }

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      stars.rotation.y += 0.0003;
      stars.rotation.x += 0.0001;
      rings.forEach((r, i) => {
        r.rotation.x += 0.002 * (i % 2 === 0 ? 1 : -1);
        r.rotation.z += 0.001;
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w2 = mount.clientWidth;
      const h2 = mount.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0" />;
}