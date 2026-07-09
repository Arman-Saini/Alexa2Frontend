import { Link } from 'react-router-dom';
import { SmartphoneWidget } from './SmartphoneWidget';

export function SmartphoneOnlyPage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex md:items-center md:justify-center bg-[#090909] select-none text-text-primary font-sans">
      {/* Immersive background glows */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-copper-500/10 blur-[130px] pointer-events-none z-0" />

      {/* Floating Home Back Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 hidden md:flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-void-border bg-black/40 hover:bg-copper-500/10 hover:border-copper-500 hover:text-copper-500 rounded"
      >
        <span>← BACK TO DASHBOARD</span>
      </Link>

      {/* Center the smartphone widget */}
      <div className="relative z-10 w-full h-full md:w-auto md:h-auto md:scale-[0.95] md:sm:scale-100 transition-all duration-300">
        <SmartphoneWidget showExitButton={true} />
      </div>
    </div>
  );
}

export default SmartphoneOnlyPage;
