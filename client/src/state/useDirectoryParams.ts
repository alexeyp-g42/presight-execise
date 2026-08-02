import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_PARAMS,
  parseDirectoryParams,
  serializeDirectoryParams,
  type DirectoryParams,
} from './directoryParams';

interface UpdateOptions {
  /** Replace the history entry instead of pushing one. Used while typing. */
  replace?: boolean;
}

/**
 * The URL is the only store for filter state. Shareability is not a feature
 * layered on afterwards — it is the storage mechanism, so a reload and a
 * pasted link cannot disagree with what is on screen.
 */
export function useDirectoryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => parseDirectoryParams(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<DirectoryParams>, options?: UpdateOptions) => {
      // Read from `previous` rather than closing over `params`, so two updates
      // in the same tick cannot clobber each other.
      setSearchParams(
        (previous) => serializeDirectoryParams({ ...parseDirectoryParams(previous), ...patch }),
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams(serializeDirectoryParams(DEFAULT_PARAMS));
  }, [setSearchParams]);

  return { params, update, clearAll };
}
