# Presight User Directory

A responsive full-stack user directory application built using React, Node.js, Express, and SQLite.

The application allows users to browse a directory, search by name, filter by nationality and hobbies, sort results, and navigate large datasets through paginated APIs and virtualized infinite scrolling.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Styling | CSS Modules |
| Virtualization | TanStack Virtual |
| Backend | Node.js 24, Express |
| Database | SQLite using better-sqlite3 |
| Monorepo | npm Workspaces, Lerna |
| Frontend web server | Nginx |
| Containerization | Docker, Docker Compose |

## Features

- Search users by first name, last name, or full name.
- Filter by multiple nationalities and hobbies.
- Display dynamic filter counts, including zero-count options.
- Sort by first name, last name, age, or nationality.
- Sort in ascending or descending order.
- Server-side filtering, sorting, and pagination.
- Infinite scrolling with row virtualization.
- Responsive layouts for desktop, tablet, and mobile.
- URL-synchronized search, filters, and sorting.
- Loading, empty-result, and error states.
- Persistent SQLite database using a Docker volume.
- Automatic database initialization and seeding.

## Prerequisites

For local development:

- Node.js 24
- npm
- Git

For containerized execution:

- Docker
- Docker Compose v2

## 1. Clone the Repository

```bash
git clone <repository-url>
cd presight-execise
```

Replace `<repository-url>` with the actual Git repository URL.

## 2. Running Locally

### Install Dependencies

From the project root:

```bash
npm ci
```

The application uses npm workspaces, so this installs dependencies for both the frontend and backend.

### Start the Backend

Open a terminal in the project root:

```bash
npm run start -w server
```

The Express API runs at:

```text
http://localhost:3001
```

The backend initializes the SQLite database and seeds 1,000 users if the database does not already contain users.

### Start the Frontend

Open another terminal:

```bash
npm run dev -w client
```

Open:

```text
http://localhost:5173
```

The Vite development proxy should forward `/api` requests to the backend at port 3001.

### Development API Proxy

The Vite configuration should proxy `/api` to:

```text
http://localhost:3001
```

This allows the React application to make API calls using relative paths without CORS problems.

## 3. Database Initialization and Seeding

The backend uses SQLite and creates the following tables:

- `users`: User information such as name, age, avatar, and nationality.
- `hobbies`: Available hobby names.
- `user_hobbies`: Many-to-many relationship between users and hobbies.

Database initialization occurs automatically through `db.js`.

Database seeding occurs through `seedDatabase()` during server startup.

The seeding process:

1. Creates the database schema if required.
2. Checks whether user records already exist.
3. Inserts 1,000 sample users if the database is empty.
4. Creates nationality and hobby associations.
5. Preserves existing records on subsequent starts.

### Local Database Location

By default, the database is located at:

```text
server/data/users.sqlite
```

The database file should be excluded from Git.

To regenerate sample data in a disposable local development environment, stop the backend and remove the local SQLite database files, including any WAL and SHM sidecars, before restarting. This deletes existing local data.

## 4. Running with Docker Compose

The application includes two services:

- `client`: React production build served by Nginx.
- `server`: Node.js Express API connected to SQLite.

### Build Images

From the project root:

```bash
docker compose build
```

### Start Services

```bash
docker compose up -d
```

### Open Application

```text
http://localhost
```

The client is exposed on host port 80.

Nginx forwards requests beginning with `/api` to the Express backend.

### View Container Status

```bash
docker compose ps
```

### View Logs

```bash
docker compose logs -f
```

View backend logs only:

```bash
docker compose logs -f server
```

### Stop Application

```bash
docker compose down
```

The SQLite Docker volume remains intact.

### Rebuild After Changes

```bash
docker compose up -d --build
```

## 5. Database Persistence with Docker

Docker Compose uses a named volume:

```yaml
volumes:
  sqlite_data:
```

The volume is mounted to:

```text
/app/server/data
```

This preserves SQLite data when the application containers are stopped or recreated.

To stop the application without deleting database data:

```bash
docker compose down
```

To delete containers and the database volume:

```bash
docker compose down -v
```

**Warning:** The `-v` option permanently removes the database volume and its data. The application will seed a fresh database on its next startup.

## 6. API Documentation

### GET /api/health

Returns backend health status.

Example:

```bash
curl http://localhost/api/health
```

### GET /api/users

Retrieves filtered, sorted, paginated user records.

Supported query parameters:

| Parameter | Description | Default |
|---|---|---|
| `search` | Search first/last/full name | Empty |
| `nationalities` | Comma-separated nationalities | All |
| `hobbies` | Comma-separated hobbies | All |
| `sortBy` | first_name, last_name, age, nationality | first_name |
| `sortDirection` | asc or desc | asc |
| `limit` | Number of users per page | 20 |
| `offset` | Pagination offset | 0 |

### Examples

Retrieve the first 20 users:

```bash
curl "http://localhost/api/users?limit=20&offset=0"
```

Search users:

```bash
curl "http://localhost/api/users?search=Emma"
```

Filter by nationality:

```bash
curl "http://localhost/api/users?nationalities=Indian"
```

Filter by nationality and hobby:

```bash
curl "http://localhost/api/users?nationalities=Indian&hobbies=Cricket"
```

Sort by age, descending:

```bash
curl "http://localhost/api/users?sortBy=age&sortDirection=desc"
```

### API Response

The response contains:

- `users`: Current page of matching users.
- `pagination`: Total records, limit, offset, and next-page information.
- `facets`: Nationality and hobby options with matching user counts.

Facet counts are calculated across the filtered dataset, not just the current page.

## 7. Filtering Behavior

Nationality selections use OR logic within the nationality group.

For example:

```text
Indian OR American
```

Hobby selections use AND logic within the hobbies group.

For example:

```text
Reading AND Cricket
```

Different groups are combined using AND logic:

```text
Nationality condition AND Hobby condition AND Search condition
```

Filter options remain visible when no users match them, with their count displayed as zero.

## 8. Infinite Scrolling and Virtualization

The frontend uses `@tanstack/react-virtual`.

The backend retrieves results in pages of 20 users.

As the user scrolls toward the bottom of the list, additional pages are requested.

The list virtualizes rows of user cards, reducing the number of DOM elements rendered at once.

The responsive layout supports:

- Three columns on wider result containers.
- Two columns on medium-width result containers.
- One column on narrow result containers.

## 9. URL-Synchronized State

Search, nationality filters, hobby filters, and sorting preferences are synchronized with URL query parameters.

Example:

```text
http://localhost/?search=Emma&nationalities=Indian&hobbies=Reading&sortBy=age&sortDirection=desc
```

This enables:

- Sharing filtered results through URLs.
- Restoring selections after refreshing the page.
- Browser Back and Forward navigation.

Infinite-scroll pagination state is maintained in React rather than the URL.

## 10. Troubleshooting

### Docker Port 80 Is Already In Use

Check which process is listening:

```bash
sudo lsof -nP -iTCP:80 -sTCP:LISTEN
```

Stop the conflicting service or change the client port mapping in `docker-compose.yml`.

### Frontend Cannot Connect to Backend

Check both containers:

```bash
docker compose ps
docker compose logs server
docker compose logs client
```

Verify that Nginx proxies `/api` to the Compose service `server:3001`.

### Database Permission Error

Confirm that the SQLite data directory is writable by the Node.js process.

### Docker Build Fails While Installing better-sqlite3

The backend Dockerfile includes native build dependencies needed by `node-gyp`, including Python, make, and g++.

Ensure the Node.js headers are available to the build environment.

## 11. Design Decisions

**SQLite:** Lightweight persisted storage suitable for a self-contained coding exercise.

**Server-side pagination:** Prevents loading the entire directory into the frontend.

**TanStack Virtual:** Reduces DOM rendering overhead for large lists.

**CSS Modules:** Provides scoped component styling without requiring a large UI framework.

**URL-synced state:** Allows filtered views to be bookmarked, shared, and restored.

**Docker Compose:** Provides a reproducible environment with separate frontend and backend services.

## 12. Development Notes

The project uses npm workspaces for dependency management.

The production React application is built with Vite and served by Nginx.

The backend runs as a non-root Node.js user inside Docker.

Generated files, development databases, environment secrets, and dependency directories should not be committed to version control.