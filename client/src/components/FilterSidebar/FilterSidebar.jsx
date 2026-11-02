import FilterGroup from "./FilterGroup";
import styles from "./FilterSidebar.module.css";

export default function FilterSidebar({
    nationalities = [],
    selectedNationalities = [],
    onNationalityChange,
    hobbies = [],
    selectedHobbies = [],
    onHobbyChange,
    onClearFilters,
}) {
    const hasActiveFilters = selectedNationalities.length > 0 || selectedHobbies.length > 0;
    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <h2 className={styles.title}>Filters</h2>
                <button
                    type="button"
                    onClick={onClearFilters}
                    disabled={!hasActiveFilters}
                    className={styles.clearButton}
                >
                    Clear all
                </button>
            </div>
            {hasActiveFilters && (
                <div className={styles.selectedFilters}>
                    {selectedNationalities.map((nationality) => (
                        <button
                            type="button"
                            key={nationality}
                            className={styles.chip}
                            onClick={() => onNationalityChange(nationality)}
                            aria-label={`Remove ${nationality} nationality filter`}
                        >
                            {nationality} x
                        </button>
                    ))}
                    {selectedHobbies.map((hobby) => (
                        <button
                            type="button"
                            key={hobby}
                            className={styles.chip}
                            onClick={() => onHobbyChange(hobby)}
                            aria-label={`Remove ${hobby} hobby filter`}
                        >
                            {hobby} x
                        </button>
                    ))}

                </div>
            )}
            <FilterGroup
                title="Nationalities"
                options={nationalities}
                selectedValues={selectedNationalities}
                onToggle={onNationalityChange}
            />
            <FilterGroup
                title="Hobbies"
                options={hobbies}
                selectedValues={selectedHobbies}
                onToggle={onHobbyChange}
            />
        </aside>
    );
}