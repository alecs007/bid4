"use client";

import { SWRConfig } from "swr";

import { ApiError } from "@/lib/types";

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 3_000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        refreshInterval: 0,
        keepPreviousData: true,
        errorRetryCount: 2,

        shouldRetryOnError: (error: unknown) => {
          if (error instanceof ApiError) {
            return error.status >= 500 || error.status === 429;
          }
          return true;
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
