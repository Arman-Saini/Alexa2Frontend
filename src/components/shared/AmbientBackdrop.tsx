const NOISE_SVG =
  `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

/**
 * Full-bleed noise-texture + copper-glow background. Extracted out of
 * SmartphoneOnlyPage so the same treatment can be reused by Home()'s mobile
 * branch without duplicating the SVG data URI a second time.
 */
export function AmbientBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none z-0 mix-blend-overlay"
        style={{ backgroundImage: NOISE_SVG }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-copper-500/10 blur-[130px] pointer-events-none z-0" />
    </>
  );
}

export default AmbientBackdrop;
