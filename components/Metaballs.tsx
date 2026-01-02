
import React, { useEffect, useRef } from 'react';

const Metaballs: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const blobs = containerRef.current?.querySelectorAll('.blob');
    if (!blobs) return;

    let frame: number;
    const animate = () => {
      blobs.forEach((blob, i) => {
        const b = blob as HTMLElement;
        const time = Date.now() * 0.0005;
        const offset = i * 2;
        
        // Base movement
        const baseX = Math.sin(time + offset) * 30 + (i % 2 === 0 ? 20 : 70);
        const baseY = Math.cos(time * 0.7 + offset) * 30 + (i % 3 === 0 ? 20 : 70);
        
        // Mouse reactivity (subtle pull)
        const mouseX = mousePos.current.x * (10 + i * 5);
        const mouseY = mousePos.current.y * (10 + i * 5);
        
        b.style.left = `${baseX + mouseX}%`;
        b.style.top = `${baseY + mouseY}%`;
      });
      frame = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden opacity-30 mix-blend-multiply bg-[#f5f2e8]">
      {/* SVG Filter for Metaballs effect */}
      <svg className="hidden">
        <defs>
          <filter id="metaball">
            <feGaussianBlur in="SourceGraphic" stdDeviation="40" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="metaball" />
            <feComposite in="SourceGraphic" in2="metaball" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="relative w-full h-full" style={{ filter: 'url(#metaball)' }}>
        <div className="blob absolute w-96 h-96 rounded-full bg-[#d4a373]/30 transition-transform duration-700 ease-out" style={{ left: '20%', top: '30%' }}></div>
        <div className="blob absolute w-72 h-72 rounded-full bg-[#faedcd]/60 transition-transform duration-1000 ease-out" style={{ left: '70%', top: '60%' }}></div>
        <div className="blob absolute w-[30rem] h-[30rem] rounded-full bg-[#ccd5ae]/30 transition-transform duration-500 ease-out" style={{ left: '50%', top: '20%' }}></div>
        <div className="blob absolute w-80 h-80 rounded-full bg-[#e9edc9]/50 transition-transform duration-1500 ease-out" style={{ left: '10%', top: '80%' }}></div>
      </div>
    </div>
  );
};

export default Metaballs;
