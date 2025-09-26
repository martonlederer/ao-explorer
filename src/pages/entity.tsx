import { useContext, useEffect, useMemo } from "react";
import { CurrentTransactionContext } from "../components/CurrentTransactionProvider";
import { ApolloClient, ApolloProvider, NormalizedCacheObject } from "@apollo/client";
import Process from "./process";
import Interaction from "./interaction";
import Transaction from "./transaction";
import Wallet from "./wallet";
import { NotFound, Wrapper } from "../components/Page";
import { useQuery } from "@tanstack/react-query";
import { GetTransaction } from "../queries/base";

export default function Entity({ id, apolloAoClient, apolloArClient }: Props) {
  const [transaction, setTransaction] = useContext(CurrentTransactionContext);
  const needsFetching = useMemo(() => !transaction || transaction.id !== id, [transaction, id]);

  const { data: queriedTx, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: async () => {
      const queryConfig = {
        query: GetTransaction,
        variables: { id }
      };

      const [aoSearchRes, arSearchRes] = await Promise.all([
        apolloAoClient.query(queryConfig),
        apolloArClient.query(queryConfig)
      ]);

      return (arSearchRes?.data?.transactions?.edges?.length || 0) > 0 ? arSearchRes : aoSearchRes;
    },
    enabled: needsFetching
  });

  useEffect(() => {
    if (!needsFetching || isLoading || !queriedTx?.data) return;
    setTransaction(queriedTx.data.transactions.edges[0]?.node);
  }, [needsFetching, queriedTx, isLoading]);

  const type = useMemo(
    () => transaction?.tags?.find((t) => t.name === "Type")?.value,
    [transaction]
  );

  if (isLoading) {
    return (
      <Wrapper>
        <NotFound>
          Loading...
        </NotFound>
      </Wrapper>
    );
  };

  if (!transaction) return <ApolloProvider client={apolloArClient}><Wallet address={id} /></ApolloProvider>;
    else if (type === "Process") return <ApolloProvider client={apolloAoClient}><Process initTx={transaction} /></ApolloProvider>;
      else if (type === "Message") return <ApolloProvider client={apolloAoClient}><Interaction message={transaction} /></ApolloProvider>;
    else return <ApolloProvider client={apolloArClient}><Transaction transaction={transaction} /></ApolloProvider>;
}

interface Props {
  id: string;
  apolloArClient: ApolloClient<NormalizedCacheObject>;
  apolloAoClient: ApolloClient<NormalizedCacheObject>
}
