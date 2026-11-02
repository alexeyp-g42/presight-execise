
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

const DEFAULT_SORT = "first_name";
const DEFAULT_DIRECTION = "asc";

const ALLOWED_SORT_FIELDS = new Set([
    "first_name",
    "last_name",
    "age",
    "nationality",
]);

function parseList(value) {
    if (!value) return [];

    return [...new Set(
        value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    )];
}

// Read search and filter state from the URL
function readUrlFilters() {
    const params = new URLSearchParams(
        window.location.search
    );

    const sortBy = params.get("sortBy");
    const sortDirection = params.get("sortDirection");

    return {
        search: params.get("search") ?? "",

        nationalities: parseList(
            params.get("nationalities")
        ),

        hobbies: parseList(
            params.get("hobbies")
        ),

        sortBy: ALLOWED_SORT_FIELDS.has(sortBy)
            ? sortBy
            : DEFAULT_SORT,

        sortDirection: ["asc", "desc"].includes(
            sortDirection
        )
            ? sortDirection
            : DEFAULT_DIRECTION,
    };
}

// Write filters to the browser URL
function writeUrlFilters(filters, mode = "push") {
    const params = new URLSearchParams(
        window.location.search
    );

    const keys = [
        "search",
        "nationalities",
        "hobbies",
        "sortBy",
        "sortDirection",
    ];

    keys.forEach((key) => params.delete(key));

    if (filters.search) {
        params.set("search", filters.search);
    }

    if (filters.nationalities.length > 0) {
        params.set(
            "nationalities",
            filters.nationalities.join(",")
        );
    }

    if (filters.hobbies.length > 0) {
        params.set(
            "hobbies",
            filters.hobbies.join(",")
        );
    }

    if (filters.sortBy !== DEFAULT_SORT) {
        params.set("sortBy", filters.sortBy);
    }

    if (filters.sortDirection !== DEFAULT_DIRECTION) {
        params.set(
            "sortDirection",
            filters.sortDirection
        );
    }

    const query = params.toString();

    const url =
        window.location.pathname +
        (query ? `?${query}` : "") +
        window.location.hash;

    const currentUrl =
        window.location.pathname +
        window.location.search +
        window.location.hash;

    if (url === currentUrl) {
        return;
    }

    if (mode === "replace") {
        window.history.replaceState(
            window.history.state,
            "",
            url
        );
    } else {
        window.history.pushState(
            window.history.state,
            "",
            url
        );
    }
}

export default function useUrlFilters() {

    const [filters, setFilters] = useState(
        readUrlFilters
    );

    // Local input value allows immediate typing.
    const [searchText, setSearchText] = useState(
        () => readUrlFilters().search
    );

    const searchTimer = useRef(null);

    const updateFilters = useCallback((
        changes,
        mode = "push"
    ) => {
        // Read current URL to avoid stale state.
        const current = readUrlFilters();

        const next = {
            ...current,
            ...changes,
        };

        writeUrlFilters(next, mode);
        setFilters(next);
    }, []);

    // Handle browser Back and Forward.
    useEffect(() => {
        function handlePopState() {
            clearTimeout(searchTimer.current);

            const restored = readUrlFilters();

            setFilters(restored);
            setSearchText(restored.search);
        }

        window.addEventListener(
            "popstate",
            handlePopState
        );

        return () => {
            window.removeEventListener(
                "popstate",
                handlePopState
            );

            clearTimeout(searchTimer.current);
        };
    }, []);

    // Update search with a 300ms debounce.
    const updateSearch = useCallback((value) => {
        setSearchText(value);

        clearTimeout(searchTimer.current);

        searchTimer.current = setTimeout(() => {
            updateFilters(
                { search: value },
                "replace"
            );
        }, 300);
    }, [updateFilters]);

    const toggleNationality = useCallback((value) => {
        const current = readUrlFilters();

        const next = current.nationalities.includes(value)
            ? current.nationalities.filter(
                (item) => item !== value
            )
            : [...current.nationalities, value];

        updateFilters({ nationalities: next });
    }, [updateFilters]);

    const toggleHobby = useCallback((value) => {
        const current = readUrlFilters();

        const next = current.hobbies.includes(value)
            ? current.hobbies.filter(
                (item) => item !== value
            )
            : [...current.hobbies, value];

        updateFilters({ hobbies: next });
    }, [updateFilters]);

    const clearFilters = useCallback(() => {
        updateFilters({
            nationalities: [],
            hobbies: [],
        });
    }, [updateFilters]);

    const clearAllFilters = useCallback(() => {
        clearTimeout(searchTimer.current);
        setSearchText("");

        updateFilters({
            search: "",
            nationalities: [],
            hobbies: [],
        });
    }, [updateFilters]);

    return {
        filters,
        searchText,
        updateSearch,
        updateFilters,
        toggleNationality,
        toggleHobby,
        clearFilters,
        clearAllFilters,
    };
}
