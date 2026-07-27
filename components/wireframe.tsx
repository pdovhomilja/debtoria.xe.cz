/** Thin-stroke wireframe polyhedron — the brand's "hero image" (flat, no fill).
 *  Colour comes from CSS `color` (stroke uses currentColor). */
export function Wireframe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
      vectorEffect="non-scaling-stroke"
      className={className}
      aria-hidden="true"
    >
      <polygon points="100,8 179.5,54 179.5,146 100,192 20.5,146 20.5,54" />
      <path d="M100,8 L100,100 M179.5,54 L100,100 M179.5,146 L100,100 M100,192 L100,100 M20.5,146 L100,100 M20.5,54 L100,100" />
      <polygon points="100,42 129,58 129,90 100,106 71,90 71,58" opacity="0.5" />
    </svg>
  );
}
