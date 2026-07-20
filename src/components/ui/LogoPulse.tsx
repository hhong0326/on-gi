import Image from 'next/image';

const SIZES = {
  sm: { width: 57, height: 20 },
  md: { width: 86, height: 30 },
} as const;

// 로딩 상태 공용 표시 — 메인 스플래시와 동일한 ONGI 펄스 로고.
// 중앙 정렬은 부모가 담당한다.
export function LogoPulse({ size = 'md' }: { size?: keyof typeof SIZES }) {
  const { width, height } = SIZES[size];
  return (
    <div className="animate-pulse" style={{ filter: 'drop-shadow(0 0 12px rgba(212, 164, 76, 0.4))' }}>
      <Image src="/logo-en-sm.svg" alt="ON-GI" width={width} height={height} priority />
    </div>
  );
}
