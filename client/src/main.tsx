import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { UserDirectoryPage } from "./user-directory/UserDirectoryPage";

import "./index.css";

/* Defaults chosen for a directory that is read-only end to end: nothing on the
   server can change under a viewer mid-session, so a refetch on every window
   focus would re-walk pages that cannot have moved. `staleTime` is also what
   will make the back button repaint instantly once the URL carries the view
   (#25) — a query key already in the cache is served without a request. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/* The plain React adapter, not a framework one: this app has zero routes, so
   nuqs reads and writes `window.location` directly — no router, and no
   `useSearchParams` to import one for. It is a provider rather than nothing at
   all because the hooks share one subscription to the address bar, which is
   what keeps two components reading the same key from ever disagreeing. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <UserDirectoryPage />
      </QueryClientProvider>
    </NuqsAdapter>
  </StrictMode>,
);
