export function StarryBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-80 mix-blend-screen" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_6%_12%,rgba(255,255,255,0.95)_0_2px,transparent_3px),radial-gradient(circle_at_18%_31%,rgba(255,255,255,0.72)_0_1px,transparent_2px),radial-gradient(circle_at_29%_17%,rgba(196,181,253,0.82)_0_1.5px,transparent_2.6px),radial-gradient(circle_at_41%_72%,rgba(255,255,255,0.84)_0_2px,transparent_3px),radial-gradient(circle_at_54%_26%,rgba(103,232,249,0.72)_0_1.5px,transparent_2.5px),radial-gradient(circle_at_68%_58%,rgba(255,255,255,0.85)_0_2px,transparent_3px),radial-gradient(circle_at_81%_20%,rgba(216,180,254,0.78)_0_1.5px,transparent_2.5px),radial-gradient(circle_at_92%_77%,rgba(255,255,255,0.92)_0_2px,transparent_3px)]" />
      <div className="absolute left-10 top-20 h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.24),transparent_66%),radial-gradient(circle_at_72%_36%,rgba(236,72,153,0.14),transparent_58%)] blur-3xl" />
      <div className="absolute bottom-28 right-20 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.2),transparent_66%),radial-gradient(circle_at_24%_72%,rgba(6,182,212,0.18),transparent_58%)] blur-3xl" />
    </div>
  );
}
