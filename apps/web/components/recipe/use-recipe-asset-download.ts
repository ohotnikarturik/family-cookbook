'use client';

import { RECIPE_DOWNLOAD_SIGNED_URL_TTL_SECONDS } from '@family-cookbook/contracts';
import { useEffect, useRef, useState } from 'react';

import {
  fetchRecipeAssetDownloadUrl,
  isDisplayableAssetDownload,
  type AssetDownloadAccept,
} from '@/lib/recipe-asset-download';

const REFRESH_AFTER_MS = RECIPE_DOWNLOAD_SIGNED_URL_TTL_SECONDS * 800;

export type AssetDownloadState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error' };

export function useRecipeAssetDownload(
  familyId: string,
  recipeId: string,
  assetId: string,
  accept: AssetDownloadAccept,
): AssetDownloadState & { reportFailure: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AssetDownloadState>({ status: 'loading' });
  const retries = useRef(0);

  useEffect(() => {
    retries.current = 0;
  }, [familyId, recipeId, assetId, accept]);

  useEffect(() => {
    let cancelled = false;

    async function load(keepReadyUrl: boolean) {
      try {
        const result = await fetchRecipeAssetDownloadUrl(familyId, recipeId, assetId);
        if (cancelled) {
          return;
        }
        if (!isDisplayableAssetDownload(result, accept)) {
          setState({ status: 'error' });
          return;
        }
        setState({ status: 'ready', url: result.signedDownloadUrl });
      } catch {
        if (cancelled) {
          return;
        }
        setState((current) =>
          keepReadyUrl && current.status === 'ready' ? current : { status: 'error' },
        );
      }
    }

    void load(false);
    const timer = window.setInterval(() => {
      void load(true);
    }, REFRESH_AFTER_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accept, assetId, attempt, familyId, recipeId]);

  function reportFailure() {
    if (retries.current >= 1) {
      setState({ status: 'error' });
      return;
    }
    retries.current += 1;
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return { ...state, reportFailure };
}
