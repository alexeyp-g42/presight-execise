import { useState } from "react";
import { hueStyle } from "@/utils/color";
import styles from "./Avatar.module.scss";

interface AvatarProps {
  src: string;
  name: string;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const Avatar = ({ src, name }: AvatarProps) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={styles.avatar} style={hueStyle(name)}>
      {hasError ? (
        <span className={styles.initials} aria-hidden="true">
          {getInitials(name)}
        </span>
      ) : (
        <img className={styles.image} src={src} alt="" loading="lazy" onError={() => setHasError(true)} />
      )}
    </div>
  );
};
