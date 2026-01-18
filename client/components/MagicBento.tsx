import React, { useRef, useEffect, useState, ReactNode } from 'react';
import './MagicBento.css';

interface MagicBentoProps {
  children?: ReactNode;
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
  disableAnimations?: boolean;
  label?: string;
  title?: string;
  description?: string;
  onClick?: () => void;
}

export default function MagicBento(props: MagicBentoProps) {
  const {
    textAutoHide = true,
    enableStars = false,
    enableSpotlight = true,
    enableBorderGlow = true,
    enableTilt = true,
    enableMagnetism = false,
    clickEffect = true,
    spotlightRadius = 280,
    particleCount = 12,
    glowColor = '132, 0, 255',
    disableAnimations = false,
    label,
    title,
    description,
    onClick,
    children,
  } = props;

  const cardRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || disableAnimations) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      card.style.setProperty('--glow-x', `${x}%`);
      card.style.setProperty('--glow-y', `${y}%`);
      card.style.setProperty('--glow-intensity', '1');

      if (enableTilt) {
        const tiltX = ((y - 50) / 50) * 2;
        const tiltY = ((x - 50) / 50) * -2;
        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px)`;
      }

      if (enableMagnetism) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const distX = (mouseX - centerX) * 0.1;
        const distY = (mouseY - centerY) * 0.1;
        card.style.transform = `translate(${distX}px, ${distY}px) ${card.style.transform}`;
      }
    };

    const handleMouseLeave = () => {
      card.style.setProperty('--glow-intensity', '0');
      card.style.transform = '';
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: Date.now() + i,
        x,
        y,
      }));
      
      setParticles(prev => [...prev, ...newParticles]);
      
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 1000);
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('click', handleClick);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('click', handleClick);
    };
  }, [disableAnimations, enableTilt, enableMagnetism, clickEffect, particleCount]);

  const cardClasses = [
    'magic-bento-card',
    textAutoHide && 'magic-bento-card--text-autohide',
    enableBorderGlow && 'magic-bento-card--border-glow',
    clickEffect && 'particle-container',
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={cardRef} 
      className={cardClasses}
      style={{
        '--glow-radius': `${spotlightRadius}px`,
        '--glow-color': glowColor,
      } as any}
      onClick={onClick}
    >
      {enableStars && (
        <div className="stars">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="star" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }} />
          ))}
        </div>
      )}

      {children || (
        <>
          <div className="magic-bento-card__header">
            {label && <span className="magic-bento-card__label">{label}</span>}
          </div>
          <div className="magic-bento-card__content">
            {title && <h3 className="magic-bento-card__title">{title}</h3>}
            {description && <p className="magic-bento-card__description">{description}</p>}
          </div>
        </>
      )}

      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: particle.x,
            top: particle.y,
          }}
        />
      ))}
    </div>
  );
}
