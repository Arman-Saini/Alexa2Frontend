import { useEffect, useRef } from 'react';

/**
 * Real optical refraction, ported from rizroze/liquid-glass (MIT).
 * Canvas-generated displacement map fed into an SVG feDisplacementMap filter,
 * three RGB passes for chromatic aberration. Chromium-only; other browsers
 * fall back to backdrop-filter: blur().
 */

interface LiquidGlassOptions {
  borderRadius?: number;
  scale?: number;
  aberration?: [number, number, number];
  blur?: number;
  border?: number;
  lightness?: number;
  alpha?: number;
  frost?: number;
  saturation?: number;
  fallbackFilter?: string;
}

interface Config {
  width: number;
  height: number;
  radius: number;
  scale: number;
  border: number;
  lightness: number;
  alpha: number;
  blur: number;
  r: number;
  g: number;
  b: number;
  frost: number;
  saturation: number;
}

const isChromium = typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent);
const mapCache = new Map<string, string>();
let instanceCount = 0;

function resolveConfig(el: HTMLElement, opts: LiquidGlassOptions): Config {
  const rect = el.getBoundingClientRect();
  const ab = opts.aberration ?? [0, 10, 20];
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    radius: opts.borderRadius ?? 28,
    scale: opts.scale ?? -180,
    border: opts.border ?? 0.07,
    lightness: opts.lightness ?? 50,
    alpha: opts.alpha ?? 0.93,
    blur: opts.blur ?? 11,
    r: ab[0],
    g: ab[1],
    b: ab[2],
    frost: opts.frost ?? 0,
    saturation: opts.saturation ?? 1,
  };
}

function buildDisplacementMap(c: Config): string {
  const key = `${c.width}:${c.height}:${c.radius}:${c.scale}:${c.border}:${c.blur}:${c.lightness}:${c.alpha}`;
  const cached = mapCache.get(key);
  if (cached) return cached;

  const maxDisplace = Math.max(Math.abs(c.scale) * 0.5, 20);
  const padX = Math.ceil(maxDisplace);
  const padY = Math.ceil(maxDisplace);
  const totalW = c.width + padX * 2;
  const totalH = c.height + padY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 128)';
  ctx.fillRect(0, 0, totalW, totalH);

  const ox = padX;
  const oy = padY;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ox, oy, c.width, c.height, c.radius);
  ctx.clip();

  ctx.fillStyle = '#000000';
  ctx.fillRect(ox, oy, c.width, c.height);

  const redGrad = ctx.createLinearGradient(ox + c.width, oy, ox, oy);
  redGrad.addColorStop(0, '#000000');
  redGrad.addColorStop(1, '#ff0000');
  ctx.fillStyle = redGrad;
  ctx.fillRect(ox, oy, c.width, c.height);

  ctx.globalCompositeOperation = 'difference';
  const blueGrad = ctx.createLinearGradient(ox, oy, ox, oy + c.height);
  blueGrad.addColorStop(0, '#000000');
  blueGrad.addColorStop(1, '#0000ff');
  ctx.fillStyle = blueGrad;
  ctx.fillRect(ox, oy, c.width, c.height);
  ctx.globalCompositeOperation = 'source-over';

  const borderPx = Math.min(c.width, c.height) * (c.border * 0.5);
  ctx.filter = `blur(${c.blur}px)`;
  ctx.fillStyle = `hsla(0, 0%, ${c.lightness}%, ${c.alpha})`;
  ctx.beginPath();
  ctx.roundRect(
    ox + borderPx,
    oy + borderPx,
    c.width - borderPx * 2,
    c.height - borderPx * 2,
    c.radius
  );
  ctx.fill();
  ctx.restore();

  const uri = canvas.toDataURL();
  mapCache.set(key, uri);
  return uri;
}

interface FilterRefs {
  svg: SVGSVGElement;
  feImage: SVGFEImageElement;
  red: Element;
  green: Element;
  blue: Element;
  filter: SVGFilterElement;
}

function createFilterSVG(id: string): FilterRefs {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
  svg.innerHTML = `
    <defs>
      <filter id="${id}" color-interpolation-filters="sRGB" x="-38%" y="-188%" width="176%" height="476%">
        <feImage result="map" preserveAspectRatio="none" />
        <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" result="dispRed" data-channel="red" />
        <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
        <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" result="dispGreen" data-channel="green" />
        <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
        <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" result="dispBlue" data-channel="blue" />
        <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
        <feBlend in="red" in2="green" mode="screen" result="rg" />
        <feBlend in="rg" in2="blue" mode="screen" result="output" />
      </filter>
    </defs>
  `;
  return {
    svg,
    filter: svg.querySelector('filter')!,
    feImage: svg.querySelector('feImage')!,
    red: svg.querySelector('[data-channel="red"]')!,
    green: svg.querySelector('[data-channel="green"]')!,
    blue: svg.querySelector('[data-channel="blue"]')!,
  };
}

function applyConfig(c: Config, refs: FilterRefs) {
  const uri = buildDisplacementMap(c);
  const maxD = Math.max(Math.abs(c.scale) * 0.5, 20);
  const pctX = Math.ceil((maxD / c.width) * 100);
  const pctY = Math.ceil((maxD / c.height) * 100);
  refs.filter.setAttribute('x', `-${pctX}%`);
  refs.filter.setAttribute('y', `-${pctY}%`);
  refs.filter.setAttribute('width', `${100 + pctX * 2}%`);
  refs.filter.setAttribute('height', `${100 + pctY * 2}%`);
  refs.feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', uri);
  refs.feImage.setAttribute('href', uri);
  refs.red.setAttribute('scale', String(c.scale + c.r));
  refs.green.setAttribute('scale', String(c.scale + c.g));
  refs.blue.setAttribute('scale', String(c.scale + c.b));
}

/** Attaches real refraction (Chromium) or a blur fallback to `ref.current`. */
export function useLiquidGlass(
  ref: React.RefObject<HTMLElement | null>,
  options: LiquidGlassOptions = {}
) {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fallback = optsRef.current.fallbackFilter ?? 'blur(20px) saturate(160%)';

    if (!isChromium) {
      element.style.backdropFilter = fallback;
      element.style.setProperty('-webkit-backdrop-filter', fallback);
      return () => {
        element.style.backdropFilter = '';
        element.style.removeProperty('-webkit-backdrop-filter');
      };
    }

    const id = `liquid-glass-${++instanceCount}`;
    const refs = createFilterSVG(id);
    document.body.appendChild(refs.svg);

    const render = () => {
      const config = resolveConfig(element, optsRef.current);
      if (config.width === 0 || config.height === 0) return;
      applyConfig(config, refs);
      element.style.backdropFilter = `url(#${id}) saturate(${config.saturation})`;
      element.style.setProperty(
        '-webkit-backdrop-filter',
        `url(#${id}) saturate(${config.saturation})`
      );
    };
    render();

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
    ro.observe(element);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      refs.svg.remove();
      element.style.backdropFilter = '';
      element.style.removeProperty('-webkit-backdrop-filter');
    };
  }, [ref]);
}
