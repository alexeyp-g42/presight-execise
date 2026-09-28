import { useId, useMemo, type CSSProperties } from "react";
import clsx from "clsx";
import type { FacetValue } from "@/types/user";
import styles from "./FacetGroup.module.scss";

interface FacetGroupProps {
  title: string;
  hint: string;
  options: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  getIcon?: (value: string) => string;
}

interface FacetOption {
  value: string;
  count: number | null;
}

const numberFormat = new Intl.NumberFormat();

export const FacetGroup = ({ title, hint, options, selected, onToggle, getIcon }: FacetGroupProps) => {
  const headingId = useId();

  const items = useMemo<FacetOption[]>(() => {
    const listed = new Set(options.map(({ value }) => value));
    const missing = selected.filter((value) => !listed.has(value)).map((value) => ({ value, count: null }));
    return [...missing, ...options];
  }, [options, selected]);

  const maxCount = Math.max(1, ...options.map(({ count }) => count));

  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          <span className={styles.rank}>Top {options.length}</span>
          {title}
        </h2>
        <span className={styles.hint}>{hint}</span>
      </header>

      {items.length === 0 ? (
        <p className={styles.empty}>Nothing to filter by</p>
      ) : (
        <ul className={styles.list}>
          {items.map(({ value, count }) => {
            const isSelected = selected.includes(value);
            const style = { "--ratio": (count ?? 0) / maxCount } as CSSProperties;

            return (
              <li key={value}>
                <label className={clsx(styles.option, isSelected && styles.selected)} style={style}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSelected}
                    onChange={() => onToggle(value)}
                  />
                  <span className={styles.check} aria-hidden="true" />
                  {getIcon && (
                    <span className={styles.icon} aria-hidden="true">
                      {getIcon(value)}
                    </span>
                  )}
                  <span className={styles.value}>{value}</span>
                  {count !== null && <span className={styles.count}>{numberFormat.format(count)}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
