export default function ShieldLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 3L42 10V22C42 33 34.5 41.5 24 45C13.5 41.5 6 33 6 22V10L24 3Z"
        fill="#141a29"
        stroke="#ff4b3e"
        strokeWidth="2.5"
      />
      <path d="M24 9L36 13.5V22C36 30 30.5 36.5 24 39V9Z" fill="#ff4b3e" fillOpacity="0.18" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontFamily="-apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="#f4f6fb"
      >
        AGS
      </text>
    </svg>
  );
}
