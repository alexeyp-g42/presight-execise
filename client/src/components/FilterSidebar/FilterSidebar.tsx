import clsx from "clsx";
import { Button } from "@/components/Button";
import { FacetGroup } from "@/components/FacetGroup";
import { StatusMessage } from "@/components/StatusMessage";
import { useFacets } from "@/hooks/useDirectoryData";
import type { DirectoryState } from "@/types/user";
import { getFlag } from "@/utils/flags";
import styles from "./FilterSidebar.module.scss";

interface FilterSidebarProps {
  state: DirectoryState;
  isOpen: boolean;
  onClose: () => void;
  onToggleNationality: (value: string) => void;
  onToggleHobby: (value: string) => void;
}

export const FilterSidebar = ({
  state,
  isOpen,
  onClose,
  onToggleNationality,
  onToggleHobby,
}: FilterSidebarProps) => {
  const { data, isPending, isError, isPlaceholderData, refetch } = useFacets(state);

  const renderContent = () => {
    if (isPending) {
      return (
        <div className={styles.skeleton} aria-label="Loading filters">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className={styles.skeletonRow} />
          ))}
        </div>
      );
    }

    if (isError && !data) {
      return (
        <StatusMessage
          compact
          icon="⚠️"
          tone="error"
          title="Couldn't load filters"
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      );
    }

    return (
      <div className={clsx(styles.groups, isPlaceholderData && styles.stale)} aria-busy={isPlaceholderData}>
        <FacetGroup
          title="Nationalities"
          hint="Any of"
          options={data.nationalities}
          selected={state.nationalities}
          onToggle={onToggleNationality}
          getIcon={getFlag}
        />
        <FacetGroup
          title="Hobbies"
          hint="All of"
          options={data.hobbies}
          selected={state.hobbies}
          onToggle={onToggleHobby}
        />
      </div>
    );
  };

  return (
    <>
      <div className={clsx(styles.backdrop, isOpen && styles.visible)} onClick={onClose} aria-hidden="true" />
      <aside id="filters" className={clsx(styles.sidebar, isOpen && styles.open)} aria-label="Filters">
        <div className={styles.mobileHeader}>
          <h2 className={styles.mobileTitle}>Filters</h2>
          <Button variant="primary" onClick={onClose}>
            Show results
          </Button>
        </div>
        {renderContent()}
      </aside>
    </>
  );
};
