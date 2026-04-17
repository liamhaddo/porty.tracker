import Image from 'next/image';

export default function Logo() {
  return (
    <Image
      src="/porty_logo.png"
      alt="porty"
      width={120}
      height={48}
      priority
      style={{ objectFit: 'contain' }}
    />
  );
}
