import React from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 60 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
