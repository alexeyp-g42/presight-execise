import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { DirectoryState } from "@/types/user";
import { parseState, toSearchParams } from "@/utils/urlState";

interface UpdateOptions {
  replace?: boolean;
}

export const useDirectoryState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseState(searchParams), [searchParams]);

  const updateState = useCallback(
    (patch: Partial<DirectoryState>, options: UpdateOptions = {}) => {
      setSearchParams((current) => toSearchParams({ ...parseState(current), ...patch }), options);
    },
    [setSearchParams],
  );

  return [state, updateState] as const;
};
