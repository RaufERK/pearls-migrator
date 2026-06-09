type Star = {
  key: string;
  top: number;
  left: number;
  size: number;
  opacity: number;
  glow: number;
};

const largeStars = makeStars('large', 50, 2, 5, 0.35, 1, 5, 15);
const mediumStars = makeStars('medium', 150, 1, 2, 0.45, 1, 2, 6);
const smallStars = makeStars('small', 220, 1, 1, 0.3, 0.8, 0, 0);

export function StarryBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-linear-to-b from-[#0a0118] via-[#1a0b3e] to-[#0d051f]" />
      <Stars stars={largeStars} glowOpacity={0.8} />
      <Stars stars={mediumStars} glowOpacity={0.55} />
      <Stars stars={smallStars} glowOpacity={0} />
      <div className="absolute left-10 top-20 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="absolute bottom-40 right-20 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
      <div className="absolute right-40 top-60 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
      <div className="absolute bottom-20 left-60 h-72 w-72 rounded-full bg-cyan-600/20 blur-3xl" />
      <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
    </div>
  );
}

function Stars({ stars, glowOpacity }: { stars: Star[]; glowOpacity: number }) {
  return stars.map((star) => (
    <span
      className="absolute rounded-full bg-white"
      key={star.key}
      style={{
        height: `${star.size}px`,
        left: `${star.left}%`,
        opacity: star.opacity,
        top: `${star.top}%`,
        width: `${star.size}px`,
        boxShadow: star.glow > 0 ? `0 0 ${star.glow}px rgba(255,255,255,${glowOpacity})` : undefined,
      }}
    />
  ));
}

function makeStars(prefix: string, count: number, minSize: number, maxSize: number, minOpacity: number, maxOpacity: number, minGlow: number, maxGlow: number): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const first = seededRandom(index + prefix.length * 101);
    const second = seededRandom(index + prefix.length * 211);
    const third = seededRandom(index + prefix.length * 307);
    const fourth = seededRandom(index + prefix.length * 419);

    return {
      key: `${prefix}-${index}`,
      top: first * 100,
      left: second * 100,
      size: minSize + third * (maxSize - minSize),
      opacity: minOpacity + fourth * (maxOpacity - minOpacity),
      glow: minGlow + first * (maxGlow - minGlow),
    };
  });
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}
