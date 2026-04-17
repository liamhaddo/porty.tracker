export default function Logo() {
  return (
    <div className="flex flex-col items-start leading-none">
      <div className="h-0.5 w-full mb-1" style={{ backgroundColor: '#2E6F40' }} />
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        fontSize: '1.75rem',
        color: '#0f1923',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        porty
      </span>
    </div>
  );
}
