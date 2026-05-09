import { useEffect, useRef } from "react";

export default function InfiniteFetchTrigger({
  onTrigger,
  loading,
  hasMore,
  className,
  children,
}: {
  onTrigger: () => void;
  loading: boolean;
  hasMore: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const node = triggerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) {
          onTrigger();
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loading, onTrigger]);

  if (!hasMore) return null;

  return (
    <>
      <div ref={triggerRef} className={className}>
        {children}
      </div>
    </>
  );
}
