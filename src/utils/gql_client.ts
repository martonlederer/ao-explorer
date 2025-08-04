import { ApolloClient, InMemoryCache } from "@apollo/client";

export const client = new ApolloClient({
  uri: "https://arweave-search.goldsky.com/graphql",
  cache: new InMemoryCache(),
});
