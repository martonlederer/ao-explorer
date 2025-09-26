import { persistCache, LocalStorageWrapper } from "apollo3-cache-persist";
import { ApolloClient, InMemoryCache } from "@apollo/client";

export async function setupApollo(apiURI: string, persist = false) {
  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          transactions: {
            keyArgs: ["ids", "owners", "recipients", "tags", "bundledIn", "ingested_at", "block", "first", "sort"],
            merge: (existing, incoming) => {
              if (!existing) return incoming;
              if (!incoming) return existing;

              const combinedEdges = existing.edges?.concat(incoming?.edges || []) || incoming?.edges;

              return {
                ...incoming,
                edges: combinedEdges
              };
            }
          }
        }
      }
    }
  });

  if (persist) {
    await persistCache({
      cache,
      storage: new LocalStorageWrapper(window.localStorage),
    });
  }

  const client = new ApolloClient({
    uri: apiURI,
    cache
  });

  return client;
}
