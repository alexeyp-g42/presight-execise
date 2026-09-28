import { useEffect, useState, type RefObject } from "react";

const BREAKPOINTS = [
  { minWidth: 1100, columns: 3 },
  { minWidth: 640, columns: 2 },
];

const getColumnCount = (width: number) => BREAKPOINTS.find(({ minWidth }) => width >= minWidth)?.columns ?? 1;

export const useColumnCount = (ref: RefObject<HTMLElement | null>) => {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    setColumns(getColumnCount(element.clientWidth));
    const observer = new ResizeObserver(([entry]) => setColumns(getColumnCount(entry.contentRect.width)));
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return columns;
};
