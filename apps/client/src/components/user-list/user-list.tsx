import { Virtuoso } from 'react-virtuoso'
import { CheckCheck, LoaderCircle, RefreshCw, SearchX, TriangleAlert } from 'lucide-react'
import type { UserSearchItem } from '@presight/schema'
import { selectClearAll, useFiltersStore } from '../../store/filters-store'
import { UserCard } from '../user-card/user-card'
import styles from './user-list.module.scss'

interface UserListProps {
    users: UserSearchItem[]
    total: number | undefined
    isLoading: boolean
    /** Showing the previous filter's results while the new ones load. */
    isRefreshing: boolean
    isError: boolean
    isFetchingNextPage: boolean
    hasNextPage: boolean
    onLoadMore: () => void
    onRetry: () => void
}

function Skeleton() {
    return (
        <div className={styles.skeleton}>
            <div className={styles.skelAvatar} />
            <div className={styles.skelBody}>
                <div className={styles.skelLine} style={{ width: '38%' }} />
                <div className={styles.skelLine} style={{ width: '58%', opacity: 0.6 }} />
            </div>
        </div>
    )
}

export function UserList(props: UserListProps) {
    const { users, total, isLoading, isRefreshing, isError, isFetchingNextPage, hasNextPage, onLoadMore, onRetry } =
        props
    const onClearAll = useFiltersStore(selectClearAll)

    // Hard error before anything rendered
    if (isError && users.length === 0) {
        return (
            <div className={styles.error} role="alert">
                <span className={styles.errorTitle}>
                    <TriangleAlert size={15} strokeWidth={2.5} aria-hidden />
                    SOMETHING WENT WRONG
                </span>
                <span className={styles.errorMsg}>Couldn't load users.</span>
                <button type="button" className={styles.retry} onClick={onRetry}>
                    <RefreshCw size={13} strokeWidth={2.5} aria-hidden />
                    RETRY
                </button>
            </div>
        )
    }

    // Empty result set
    if (total === 0) {
        return (
            <div className={styles.empty}>
                <div className={styles.emptyTitle}>
                    <SearchX size={26} strokeWidth={2} aria-hidden />
                    NO USERS FOUND
                </div>
                <div className={styles.emptyMsg}>Nobody matches the current filters. Ease off and try again.</div>
                <button type="button" className={styles.clearBtn} onClick={onClearAll}>
                    <RefreshCw size={13} strokeWidth={2.5} aria-hidden />
                    CLEAR ALL FILTERS
                </button>
            </div>
        )
    }

    return (
        <div className={styles.host}>
            {isLoading ? (
                // Nothing to sit behind the overlay on a cold start, so skeletons give it texture.
                <div className={styles.stack} aria-hidden>
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} />
                    ))}
                </div>
            ) : (
                <Virtuoso
                    useWindowScroll
                    data={users}
                    computeItemKey={(_, user) => user.id}
                    overscan={400}
                    endReached={onLoadMore}
                    itemContent={(_, user) => (
                        <div className={styles.item}>
                            <UserCard user={user} />
                        </div>
                    )}
                    components={{
                        Footer: () => {
                            if (isError) {
                                return (
                                    <div className={styles.error} role="alert">
                                        <span className={styles.errorTitle}>
                                            <TriangleAlert size={15} strokeWidth={2.5} aria-hidden />
                                            SOMETHING WENT WRONG
                                        </span>
                                        <span className={styles.errorMsg}>Couldn't load the next page of users.</span>
                                        <button type="button" className={styles.retry} onClick={onRetry}>
                                            <RefreshCw size={13} strokeWidth={2.5} aria-hidden />
                                            RETRY
                                        </button>
                                    </div>
                                )
                            }
                            if (isFetchingNextPage) {
                                return (
                                    <div className={styles.stack}>
                                        <Skeleton />
                                        <div className={styles.loadingLabel}>
                                            <LoaderCircle
                                                className={styles.spinner}
                                                size={14}
                                                strokeWidth={2.5}
                                                aria-hidden
                                            />
                                            LOADING MORE…
                                        </div>
                                    </div>
                                )
                            }
                            if (!hasNextPage) {
                                return (
                                    <div className={styles.end}>
                                        <CheckCheck size={14} strokeWidth={2.5} aria-hidden />
                                        ALL {total?.toLocaleString()} USERS LOADED
                                    </div>
                                )
                            }
                            return null
                        },
                    }}
                />
            )}

            {(isLoading || isRefreshing) && (
                <div className={styles.overlay} role="status" aria-live="polite">
                    <div className={styles.overlayPanel}>
                        <LoaderCircle className={styles.spinner} size={16} strokeWidth={2.5} aria-hidden />
                        {isLoading ? 'LOADING USERS…' : 'UPDATING RESULTS…'}
                    </div>
                </div>
            )}
        </div>
    )
}
