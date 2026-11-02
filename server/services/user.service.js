
const collator = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true
});

function matchesSearchText(user, searchText) {
    if (!searchText) {
        return true;
    }
    const firstName = user.firstName.toLowerCase();
    const lastName = user.lastName.toLowerCase();
    const fullName = `${firstName} ${lastName}`

    return (
        firstName.includes(searchText) || lastName.includes(searchText) || fullName.includes(searchText)
    );
}

function matchesNationlity(user, nationalities) {
    if (nationalities.length === 0) {
        return true;
    }
    return nationalities.includes(user.nationality);
}

function matchesHobbies(user, hobbies) {
    if (hobbies.length === 0) {
        return true;
    }
    return hobbies.every((hobby) => user.hobbies.includes(hobby));
}

function calculateFacets(filteredUsers, field) {
    const countsMap = new Map();
    filteredUsers.forEach((user) => {
        const values = Array.isArray(user[field]) ? user[field] : [user[field]];
        new Set(values).forEach((value) => {
            if (!value) return;
            countsMap.set(value, (countsMap.get(value) || 0) + 1);
        });
    });
    return [...countsMap.entries()]
        .map(([name, count]) => ({name, count}))
        .sort((a, b) => 
            b.count - a.count || a.name.localeCompare(b.name)
        )
        .slice(0, 20);
}

function compareUsers(userA, userB, sortBy, sortDirection) {
    let comparison = 0;
    switch(sortBy) {
        case "first_name":
            comparison = collator.compare(userA.firstName, userB.firstName);
            break;
        
        case "last_name":
            comparison = collator.compare(userA.lastName, userB.lastName);
            break;
        
        case "nationality":
            comparison = collator.compare(userA.nationality, userB.nationality);
            break;
    }

    const direction = sortDirection === "desc" ? -1 : 1;

    return comparison * direction || userA.id - userB.id;
}

function getUsers({
    search = "",
    nationalities = [],
    hobbies = [],
    sortBy = "first_name",
    sortDirection = "asc",
    limit = 20,
    offset = 0
} = {}) {

    console.log("Total mock users:", users.length);
    console.log("Search:", search);
    console.log("Nationalities:", nationalities);
    console.log("Hobbies:", hobbies);

    console.log("Total mock users:", users.length);

    console.log("Filters:", {
        search,
        nationalities,
        hobbies
    });

    const normalizedSearchText = search.trim().toLowerCase();
    const filteredUsers = users.filter((user) => {
        const matchedSearch = matchesSearchText(user, normalizedSearchText);
        const matchedNationlity = matchesNationlity(user, nationalities) ;
        const matchedHobbies = matchesHobbies(user, hobbies);
        return matchedSearch && matchedNationlity && matchedHobbies;
    });

    const total = filteredUsers.length;
    const facets = {
        nationalities: calculateFacets(filteredUsers, "nationality"),
        hobbies: calculateFacets(filteredUsers, "hobbies")
    }
    const sortedUsers = [...filteredUsers].sort((a, b) => compareUsers(a, b, sortBy, sortDirection));
    const paginatedUsers = sortedUsers.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    return {
        users: paginatedUsers,
        pagination: {
            total, 
            limit,
            offset,
            returned: paginatedUsers.length,
            hasMore: nextOffset < total,
            nextOffset: nextOffset < total ? nextOffset : null
        },
        facets
    }
}

export default getUsers;