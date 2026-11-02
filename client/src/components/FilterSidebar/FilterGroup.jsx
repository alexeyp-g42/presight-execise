import styles from "./FilterSidebar.module.css";

export default function FilterGroup({
    title,
    options = [],
    selectedValues = [],
    onToggle,
}) {
    return (
        <section className={styles.filterGroup}>
            <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>{title}</h3>
                <span className={styles.groupCount}>Top 20</span>
            </div>
            <div className={styles.optionList}>
                {options.length === 0 ? (
                   <p className={styles.empty}>
                    No matching options
                   </p>
                ) : (
                    options.map(({name, count}) => (
                        <label 
                            key={name}
                            className={styles.filterOption}
                        >
                            <input 
                                type="checkbox" 
                                checked={selectedValues.includes(name)}
                                onChange={() => onToggle(name)}
                                className={styles.checkbox}
                            />
                            <span className={styles.optionName}>
                                {name}
                            </span>
                            <span className={styles.optionCount}>
                                {count}
                            </span>

                        </label>
                    ))
                )}
            </div>

        </section>
    );
}
