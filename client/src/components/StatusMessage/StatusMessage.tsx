import type { ReactNode } from "react";
import clsx from "clsx";
import styles from "./StatusMessage.module.scss";

interface StatusMessageProps {
  title: string;
  description?: string;
  icon?: string;
  tone?: "neutral" | "error";
  action?: ReactNode;
  compact?: boolean;
}

export const StatusMessage = ({
  title,
  description,
  icon,
  tone = "neutral",
  action,
  compact,
}: StatusMessageProps) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className={clsx(styles.status, compact && styles.compact, tone === "error" && styles.error)}
  >
    {icon && (
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    )}
    <p className={styles.title}>{title}</p>
    {description && <p className={styles.description}>{description}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);
