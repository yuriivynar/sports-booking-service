/**
 * Confetti after a successful booking. The library is loaded only now,
 * so it never weighs on the first page load, and it stays quiet for
 * visitors who asked for reduced motion.
 */
export async function celebrate(): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#ff7a1a', '#ffb020', '#3b82f6', '#22c55e'];
  const burst = (x: number, angle: number) =>
    confetti({
      particleCount: 70,
      spread: 70,
      startVelocity: 45,
      angle,
      origin: { x, y: 0.7 },
      colors,
    });
  burst(0.2, 60);
  burst(0.8, 120);
}
