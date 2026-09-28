import type { CSSProperties } from "react";

export const hueFromString = (value: string) => {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % 360;
};

export const hueStyle = (value: string) => ({ "--hue": hueFromString(value) }) as CSSProperties;
