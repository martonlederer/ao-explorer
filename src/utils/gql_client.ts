import { persistCache, LocalStorageWrapper } from "apollo3-cache-persist";
import { ApolloClient, InMemoryCache } from "@apollo/client";

export async function setupApollo(persist = false) {
  const cache = new InMemoryCache();

  if (persist) {
    await persistCache({
      cache,
      storage: new LocalStorageWrapper(window.localStorage),
    });
  }

  const client = new ApolloClient({
    uri: "https://arweave-search.goldsky.com/graphql",
    cache
  });

  return client;
}
