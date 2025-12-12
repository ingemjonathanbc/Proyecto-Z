import React, { useEffect, useRef } from 'react';

const ParticleOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      opacitySpeed: number;
      blur: number;
    }

    let particles: Particle[] = [];

    const resize = () => {
      // Use offsetWidth/Height for accurate sizing
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };

    const initParticles = () => {
      particles = [];
      const particleCount = 60; // Denser atmosphere
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
      }
    };

    const createParticle = (): Particle => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.2, // Smaller, finer dust
        speedX: (Math.random() - 0.5) * 0.2, // Drift horizontally
        speedY: (Math.random() - 0.5) * 0.2 - 0.1, // Slight upward draft
        opacity: Math.random() * 0.5,
        opacitySpeed: (Math.random() - 0.5) * 0.01, // Twinkle effect
        blur: Math.random() * 2 // Depth of field
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        // Movement
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.opacitySpeed;

        // Twinkle Logic
        if (p.opacity <= 0 || p.opacity >= 0.6) {
          p.opacitySpeed *= -1;
        }

        // Boundary Wrap
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Golden/Amber tint for warmth instead of pure white
        ctx.fillStyle = `rgba(255, 248, 220, ${Math.max(0, p.opacity)})`;
        
        // Manual blur implementation for performance (filter is slow)
        // larger particles are "closer" and sharper, smaller are "farther" and blurrier
        if (p.blur > 1) {
            ctx.shadowBlur = p.blur;
            ctx.shadowColor = `rgba(255, 248, 220, ${Math.max(0, p.opacity)})`;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen" />;
};

export default ParticleOverlay;