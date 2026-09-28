import { Button } from "@/components/Button";
import { getFlag } from "@/utils/flags";
import styles from "./ActiveFilters.module.scss";

interface ActiveFiltersProps {
  nationalities: string[];
  hobbies: string[];
  onRemoveNationality: (value: string) => void;
  onRemoveHobby: (value: string) => void;
  onClear: () => void;
}

interface ChipProps {
  label: string;
  icon?: string;
  onRemove: () => void;
}

const Chip = ({ label, icon, onRemove }: ChipProps) => (
  <li className={styles.chip}>
    {icon && <span aria-hidden="true">{icon}</span>}
    <span>{label}</span>
    <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove ${label}`}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m4.5 4.5 7 7m0-7-7 7" strokeLinecap="round" />
      </svg>
    </button>
  </li>
);

export const ActiveFilters = ({
  nationalities,
  hobbies,
  onRemoveNationality,
  onRemoveHobby,
  onClear,
}: ActiveFiltersProps) => {
  if (nationalities.length === 0 && hobbies.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <ul className={styles.chips} aria-label="Active filters">
        {nationalities.map((value) => (
          <Chip
            key={`nationality-${value}`}
            label={value}
            icon={getFlag(value)}
            onRemove={() => onRemoveNationality(value)}
          />
        ))}
        {hobbies.map((value) => (
          <Chip key={`hobby-${value}`} label={value} onRemove={() => onRemoveHobby(value)} />
        ))}
      </ul>
      <Button variant="ghost" onClick={onClear}>
        Clear all
      </Button>
    </div>
  );
};
