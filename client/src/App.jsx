
import { useCallback, useEffect, useRef, useState } from "react";

import FilterSidebar from "./components/FilterSidebar/FilterSidebar";
import SearchBar from "./components/SearchBar/SearchBar";
import SortControls from "./components/SortControls/SortControls";
import UserListState from "./components/UserListState/UserListState";
import VirtualUserList from "./components/VirtualUserList/VirtualUserList";

import { fetchUsers } from "./services/userApi";
import useUrlFilters from "./hooks/useUrlFilters";

import styles from "./App.module.css";


const PAGE_SIZE = 20;

export default function App() {
    const {
        filters,
        searchText,
        updateSearch,
        updateFilters,
        toggleNationality,
        toggleHobby,
        clearFilters,
        clearAllFilters,
    } = useUrlFilters();

    // Derive application state from URL
    const selectedNationalities = filters.nationalities;
    const selectedHobbies = filters.hobbies;

    const sortField = filters.sortBy;
    const sortDirection = filters.sortDirection;

    // Search value used in API requests
    const debouncedSearch = filters.search;


    // API data
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);

    const [facets, setFacets] = useState({
        nationalities: [],
        hobbies: [],
    });

    // Request states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Prevent duplicate requests
    const pageRequestInProgress = useRef(false);
    const pageControllerRef = useRef(null);

    // Identify the current search/filter request generation
    const requestGeneration = useRef(0);

    // Load the FIRST page whenever search,
    // filters, sorting, or retry changes
    useEffect(() => {
        const controller = new AbortController();

        const generation = ++requestGeneration.current;

        // Cancel any previous next-page request
        pageControllerRef.current?.abort();
        pageRequestInProgress.current = false;

        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        setIsLoadingMore(false);

        setUsers([]);
        setPagination(null);

        async function loadFirstPage() {
            try {
                const response = await fetchUsers({
                    search: debouncedSearch,
                    nationalities: selectedNationalities,
                    hobbies: selectedHobbies,
                    sortBy: sortField,
                    sortDirection,
                    limit: PAGE_SIZE,
                    offset: 0,
                    signal: controller.signal,
                });

                if (
                    controller.signal.aborted ||
                    generation !== requestGeneration.current
                ) {
                    return;
                }

                setUsers(response.users);
                setPagination(response.pagination);
                setFacets(response.facets);

            } catch (err) {
                if (
                    controller.signal.aborted ||
                    generation !== requestGeneration.current
                ) {
                    return;
                }

                console.error("Failed to load users:", err);

                setError(err.message || "Failed to load users");

            } finally {
                if (
                    !controller.signal.aborted &&
                    generation === requestGeneration.current
                ) {
                    setLoading(false);
                }
            }
        }

        loadFirstPage();

        return () => {
            controller.abort();
            pageControllerRef.current?.abort();
            requestGeneration.current++;
        };
    }, [
        debouncedSearch,
        selectedNationalities,
        selectedHobbies,
        sortField,
        sortDirection,
        retryCount,
    ]);

    // Load the NEXT page
    const loadMoreUsers = useCallback(async () => {
        if (
            loading ||
            pageRequestInProgress.current ||
            !pagination?.hasMore ||
            pagination.nextOffset == null
        ) {
            return;
        }

        pageRequestInProgress.current = true;

        const controller = new AbortController();
        pageControllerRef.current = controller;

        const generation = requestGeneration.current;

        setIsLoadingMore(true);
        setLoadMoreError(null);

        try {
            const response = await fetchUsers({
                search: debouncedSearch,
                nationalities: selectedNationalities,
                hobbies: selectedHobbies,
                sortBy: sortField,
                sortDirection,
                limit: PAGE_SIZE,
                offset: pagination.nextOffset,
                signal: controller.signal,
            });

            if (
                controller.signal.aborted ||
                generation !== requestGeneration.current
            ) {
                return;
            }

            // Append rather than replace existing users
            setUsers((previous) => [
                ...previous,
                ...response.users,
            ]);

            setPagination(response.pagination);

            // Facets describe the entire filtered result set,
            // not just the newly fetched page.
            setFacets(response.facets);

        } catch (err) {
            if (
                controller.signal.aborted ||
                generation !== requestGeneration.current
            ) {
                return;
            }

            console.error("Failed to load next page:", err);

            setLoadMoreError(
                err.message || "Could not load more users"
            );

        } finally {
            if (generation === requestGeneration.current) {
                pageRequestInProgress.current = false;
                pageControllerRef.current = null;
                setIsLoadingMore(false);
            }
        }
    }, [
        loading,
        pagination,
        debouncedSearch,
        selectedNationalities,
        selectedHobbies,
        sortField,
        sortDirection,
    ]);

    function retryLoading() {
        setRetryCount((previous) => previous + 1);
    }

    return (
        <main className={styles.container}>
            <h1 className={styles.title}>
                Presight User Directory
            </h1>

            <SearchBar
                value={searchText}
                onChange={updateSearch}
            />

            <div className={styles.layout}>
                <FilterSidebar
                    nationalities={facets.nationalities}
                    hobbies={facets.hobbies}
                    selectedNationalities={selectedNationalities}
                    selectedHobbies={selectedHobbies}
                    onNationalityChange={toggleNationality}
                    onHobbyChange={toggleHobby}
                    onClearFilters={clearFilters}
                />

                <section className={styles.results}>
                    <div className={styles.resultsHeader}>
                        <h2 className={styles.resultsTitle}>
                            Matching Users (
                            {loading ? "..." : pagination?.total ?? 0})
                        </h2>

                        <SortControls
                            sortField={sortField}
                            sortDirection={sortDirection}
                            onSortFieldChange={(value) => updateFilters({ sortBy: value })}
                            onSortDirectionChange={(value) => updateFilters({ sortDirection: value })}
                        />
                    </div>

                    {loading ? (
                        <UserListState type="loading" />
                    ) : error ? (
                        <UserListState
                            type="error"
                            message={error}
                            onRetry={retryLoading}
                        />
                    ) : users.length === 0 ? (
                        <UserListState
                            type="empty"
                            onClear={clearAllFilters}
                        />
                    ) : (
                        <>
                            <VirtualUserList
                                users={users}
                                hasMore={pagination?.hasMore ?? false}
                                isLoadingMore={isLoadingMore}
                                loadMoreError={loadMoreError}
                                onLoadMore={loadMoreUsers}
                                onRetry={loadMoreUsers}
                            />

                            <p className={styles.paginationInfo}>
                                Showing {users.length} of{" "}
                                {pagination?.total ?? 0} users
                            </p>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}
