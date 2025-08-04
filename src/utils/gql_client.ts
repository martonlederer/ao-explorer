import { ApolloClient, InMemoryCache, ApolloProvider, gql } from "@apollo/client";

export const client = new ApolloClient({
  uri: "https://arweave-search.goldsky.com/graphql",
  cache: new InMemoryCache(),
});
