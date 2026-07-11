import { Component, type ReactNode } from 'react';

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function Fallback({ reason }: { reason: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
      style={{ backgroundColor: '#161514', color: '#e0dbd5' }}
    >
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#e9b44c]">3D view unavailable</span>
      <p className="font-mono text-[11px] text-[#a8a198] max-w-sm">{reason}</p>
    </div>
  );
}

interface State {
  hasError: boolean;
}

/**
 * Wraps a react-three-fiber <Canvas> tree. Two failure modes it guards
 * against, neither of which r3f handles on its own: no WebGL support at all
 * (older browsers, some in-app webviews, software-only GPUs) caught before
 * mount, and a render-time crash inside the 3D tree (driver crash, lost
 * context turning into a thrown error) caught by the boundary instead of
 * white-screening the whole page.
 */
export class Canvas3DBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[Canvas3DBoundary] 3D scene crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return <Fallback reason="This scene stopped responding. Refresh the page to try again." />;
    }
    if (!hasWebGL()) {
      return <Fallback reason="Your browser or device doesn't support WebGL, which this 3D scene needs." />;
    }
    return this.props.children;
  }
}
