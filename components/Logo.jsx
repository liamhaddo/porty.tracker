// Shared branded wordmark used on both the home screen and the tracker header.

export default function Logo() {
  return (
    <span
      style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        lineHeight: 1,
        display: 'inline-block',
      }}
    >
      <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#111827' }}>
        porty.
      </span>
      <span style={{ fontSize: '1.35rem', fontWeight: 600, color: '#9CA3AF' }}>
        tracker
      </span>
    </span>
  );
}
