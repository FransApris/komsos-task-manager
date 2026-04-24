/**
 * useFirestoreQuery — bridges Firestore real-time onSnapshot into React Query's cache.
 *
 * Pattern:  onSnapshot → queryClient.setQueryData
 *           components read via useQuery (staleTime: Infinity)
 *
 * Benefits vs plain useState + onSnapshot:
 *  - Single subscription per queryKey even when many components call the same hook
 *  - Background cache survives component unmounts (gcTime window)
 *  - Consistent loading / error state from React Query
 *  - Future-proof: swap to getDocs + refetchInterval with no component changes
 */
import { useEffect, DependencyList } from 'react';
import { useQueryClient, useQuery, QueryKey } from '@tanstack/react-query';
import { onSnapshot } from '../firebase';
import type { Query, CollectionReference, DocumentData } from 'firebase/firestore';

type FirestoreQueryable = Query<DocumentData> | CollectionReference<DocumentData>;

export function useFirestoreQuery<T>(
  /** Stable cache key — same key = shared subscription & cache */
  queryKey: QueryKey,
  /** Called when deps change to build the Firestore query/collection ref */
  buildQuery: () => FirestoreQueryable | null,
  /** Maps a raw Firestore doc (with id injected) to your domain type */
  transform: (doc: Record<string, any> & { id: string }) => T,
  /** Re-subscribe when these values change (include enabled + any query deps) */
  deps: DependencyList = [],
  options: {
    /** Pause the subscription and return empty data */
    enabled?: boolean;
    /** Custom error handler — defaults to console.error */
    onError?: (error: unknown) => void;
  } = {}
) {
  const queryClient = useQueryClient();
  const { enabled = true, onError } = options;

  useEffect(() => {
    if (!enabled) return;

    const q = buildQuery();
    if (!q) return;

    const unsub = onSnapshot(
      q as any,
      (snap: any) => {
        const data: T[] = snap.docs.map((d: any) =>
          transform({ id: d.id, ...d.data() })
        );
        queryClient.setQueryData(queryKey, data);
      },
      onError ?? ((err) => console.error('[useFirestoreQuery]', queryKey, err))
    );

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return useQuery<T[]>({
    queryKey: queryKey as any[],
    // queryFn is only called if cache is empty — normally setQueryData fills it first
    queryFn: () => queryClient.getQueryData<T[]>(queryKey as any[]) ?? [],
    // onSnapshot keeps data always up-to-date → never consider stale
    staleTime: Infinity,
    // Keep cache alive for 10 min after last subscriber unmounts
    gcTime: 10 * 60 * 1000,
    enabled,
    initialData: [],
  });
}
