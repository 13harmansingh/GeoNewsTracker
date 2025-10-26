import L from "leaflet";

// iOS 26-inspired gradient colors by category
export const PIN_GRADIENTS = {
  SPORTS: {
    from: '#FF6B35', // Vibrant orange
    to: '#FF3030',   // Bright red
    icon: 'sports',
    shadow: 'rgba(255, 107, 53, 0.4)',
  },
  GLOBAL: {
    from: '#007AFF', // iOS blue
    to: '#0051D5',   // Deep blue
    icon: 'globe',
    shadow: 'rgba(0, 122, 255, 0.4)',
  },
  TRENDING: {
    from: '#FF2D55', // iOS pink
    to: '#C644FC',   // Purple
    icon: 'fire',
    shadow: 'rgba(255, 45, 85, 0.4)',
  },
  TECH: {
    from: '#5E5CE6', // iOS indigo
    to: '#BF5AF2',   // Purple
    icon: 'cpu',
    shadow: 'rgba(94, 92, 230, 0.4)',
  },
  BUSINESS: {
    from: '#34C759', // iOS green
    to: '#30B0C7',   // Teal
    icon: 'briefcase',
    shadow: 'rgba(52, 199, 89, 0.4)',
  },
  ENTERTAINMENT: {
    from: '#FF9500', // iOS orange
    to: '#FF3B30',   // Red
    icon: 'star',
    shadow: 'rgba(255, 149, 0, 0.4)',
  },
  HEALTH: {
    from: '#32ADE6', // Light blue
    to: '#34C759',   // Green
    icon: 'heart',
    shadow: 'rgba(50, 173, 230, 0.4)',
  },
  SCIENCE: {
    from: '#30B0C7', // Teal
    to: '#34C759',   // Green
    icon: 'flask',
    shadow: 'rgba(48, 176, 199, 0.4)',
  },
  USER: {
    from: '#FFD60A', // Gold
    to: '#FF9500',   // Amber
    icon: 'star-filled',
    shadow: 'rgba(255, 214, 10, 0.5)',
  },
};

// Icon SVG paths for each category
const ICON_PATHS: Record<string, string> = {
  sports: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
  globe: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
  fire: '<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>',
  cpu: '<path d="M9 3H3v6h6V3zm2 0v6h10V3H11zm-2 8H3v10h6V11zm2 0v10h10V11H11z"/>',
  briefcase: '<path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  'star-filled': '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="white"/>',
  heart: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  flask: '<path d="M7 2v2h1v14c0 2.21 1.79 4 4 4s4-1.79 4-4V4h1V2H7zm5 16c-1.1 0-2-.9-2-2V4h4v12c0 1.1-.9 2-2 2z"/>',
};

// Create iOS 26-style pin with glassmorphism and tinted glass
export function createApplePinIcon(
  category: string, 
  isUserCreated: boolean = false
): L.DivIcon {
  const design = isUserCreated 
    ? PIN_GRADIENTS.USER 
    : PIN_GRADIENTS[category as keyof typeof PIN_GRADIENTS] || PIN_GRADIENTS.GLOBAL;
  
  const iconPath = ICON_PATHS[design.icon] || ICON_PATHS.globe;
  
  // Convert hex to rgba for tinted glass effect
  const fromRgba = hexToRgba(design.from, 0.25); // Very translucent
  const toRgba = hexToRgba(design.to, 0.35);     // Slightly more opaque
  
  return L.divIcon({
    html: `
      <div class="apple-pin-wrapper" style="animation: pinDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <!-- Outer glow -->
        <div class="pin-glow" style="
          position: absolute;
          inset: -8px;
          background: radial-gradient(circle, ${design.shadow} 0%, transparent 70%);
          filter: blur(12px);
          opacity: 0.5;
          animation: pulseGlow 2s ease-in-out infinite;
        "></div>
        
        <!-- Pin container with glassmorphism -->
        <div class="pin-container" style="
          position: relative;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, ${fromRgba} 0%, ${toRgba} 100%);
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          box-shadow: 
            0 8px 32px ${design.shadow},
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <!-- Glass shine effect (top) -->
          <div style="
            position: absolute;
            top: 2px;
            left: 4px;
            right: 4px;
            height: 20px;
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.1));
            border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
            pointer-events: none;
            filter: blur(1px);
          "></div>
          
          <!-- Glass reflection (bottom) -->
          <div style="
            position: absolute;
            bottom: 2px;
            left: 4px;
            right: 4px;
            height: 12px;
            background: linear-gradient(to top, rgba(255, 255, 255, 0.15), transparent);
            border-radius: 50%;
            pointer-events: none;
          "></div>
          
          <!-- Colored tint overlay -->
          <div style="
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, ${hexToRgba(design.from, 0.4)} 0%, ${hexToRgba(design.to, 0.5)} 100%);
            border-radius: 50%;
            pointer-events: none;
            mix-blend-mode: overlay;
          "></div>
          
          <!-- Icon -->
          <svg class="pin-icon" width="24" height="24" viewBox="0 0 24 24" fill="white" style="
            position: relative;
            z-index: 2;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          ">
            ${iconPath}
          </svg>
        </div>
        
        <!-- Indicator dot for user-created pins -->
        ${isUserCreated ? `
          <div class="pin-indicator" style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            background: linear-gradient(135deg, rgba(255, 214, 10, 0.9), rgba(255, 149, 0, 0.9));
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.9);
            box-shadow: 
              0 2px 8px rgba(255, 214, 10, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(10px);
            animation: indicatorPulse 1.5s ease-in-out infinite;
          "></div>
        ` : ''}
      </div>
    `,
    className: 'apple-pin-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
}

// Helper function to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Add CSS animations to the document
export function injectPinAnimations() {
  if (typeof document === 'undefined') return;
  
  const styleId = 'apple-pin-animations';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes pinDrop {
      0% {
        transform: translateY(-100px) scale(0.3);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes pulseGlow {
      0%, 100% {
        opacity: 0.4;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }
    
    @keyframes indicatorPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.8;
      }
    }
    
    .apple-pin-marker:hover .pin-container {
      transform: scale(1.15) translateY(-4px);
      box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.3),
        0 6px 20px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.5) !important;
    }
    
    .apple-pin-marker:active .pin-container {
      transform: scale(0.95);
      transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .apple-pin-wrapper {
      position: relative;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}
