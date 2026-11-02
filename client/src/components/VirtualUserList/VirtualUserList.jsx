
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import UserCard from "../UserCard/UserCard";
import styles from "./VirtualUserList.module.css";

const SCROLL_THRESHOLD = 250;

// Breakpoints based on the RESULTS container width,
// not the entire browser window.
function getColumnCount(width) {
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
}

export default function VirtualUserList({
    users,
    hasMore,
    isLoadingMore,
    loadMoreError,
    onLoadMore,
    onRetry,
}) {
    const scrollRef = useRef(null);

    const [containerWidth, setContainerWidth] = useState(0);

    // Observe the actual available width of the user list.
    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;

            if (width !== undefined) {
                setContainerWidth(width);
            }
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const columnCount = getColumnCount(containerWidth);

    // Group users into rows based on available columns.
    const rows = useMemo(() => {
        const result = [];

        for (let i = 0; i < users.length; i += columnCount) {
            result.push(users.slice(i, i + columnCount));
        }

        return result;
    }, [users, columnCount]);

    // An additional virtual row represents the loading indicator.
    const virtualCount = rows.length + (hasMore ? 1 : 0);

    const virtualizer = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => scrollRef.current,

        // Initial estimate; measureElement calculates real heights.
        estimateSize: () => 200,

        overscan: 3,

        getItemKey: (index) => {
            if (index >= rows.length) {
                return "load-more";
            }

            return `${columnCount}-${rows[index][0].id}`;
        },
    });

    // Recalculate positions when the number of columns changes.
    useEffect(() => {
        virtualizer.measure();
    }, [columnCount, virtualizer]);

    function isNearBottom(element) {
        const distanceFromBottom =
            element.scrollHeight -
            element.scrollTop -
            element.clientHeight;

        return distanceFromBottom <= SCROLL_THRESHOLD;
    }

    function handleScroll(event) {
        if (!hasMore || isLoadingMore || loadMoreError) {
            return;
        }

        if (isNearBottom(event.currentTarget)) {
            onLoadMore();
        }
    }

    // Load another page if the viewport isn't filled,
    // or if the user is already close to the bottom.
    useEffect(() => {
        const element = scrollRef.current;

        if (!element || !hasMore || isLoadingMore || loadMoreError) {
            return;
        }

        if (isNearBottom(element)) {
            onLoadMore();
        }
    }, [
        users.length,
        columnCount,
        hasMore,
        isLoadingMore,
        loadMoreError,
        onLoadMore,
    ]);

    return (
        <div className={styles.container}>
            <div
                ref={scrollRef}
                className={styles.scrollContainer}
                onScroll={handleScroll}
                aria-label="User results"
            >
                <div
                    className={styles.virtualContent}
                    style={{
                        height: virtualizer.getTotalSize(),
                    }}
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const rowUsers = rows[virtualRow.index];

                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                className={styles.virtualRow}
                                style={{
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {rowUsers ? (
                                    <div
                                        className={styles.userGrid}
                                        style={{
                                            gridTemplateColumns:
                                                `repeat(${columnCount}, minmax(0, 1fr))`,
                                        }}
                                    >
                                        {rowUsers.map((user) => (
                                            <UserCard
                                                key={user.id}
                                                user={user}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div
                                        className={styles.loadMore}
                                        role="status"
                                    >
                                        {isLoadingMore
                                            ? "Loading more users..."
                                            : "Scroll to load more"}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {loadMoreError && (
                <div
                    className={styles.error}
                    role="alert"
                >
                    <p>{loadMoreError}</p>

                    <button
                        type="button"
                        className={styles.retryButton}
                        onClick={onRetry}
                    >
                        Retry loading
                    </button>
                </div>
            )}
        </div>
    );
}
