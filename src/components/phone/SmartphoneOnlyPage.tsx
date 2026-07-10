import { Link } from 'react-router-dom';
import { SmartphoneWidget } from './SmartphoneWidget';

export function SmartphoneOnlyPage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex md:items-center md:justify-center bg-[#090909] select-none text-text-primary font-sans">

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
