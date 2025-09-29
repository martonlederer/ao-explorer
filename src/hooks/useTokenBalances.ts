import { useQuery as useApolloQuery } from "@apollo/client";
import { defaultGraphqlTransactions } from "../queries/base";
import { GetTransfersFor } from "../queries/messages";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagValue } from "../utils/format";
import { dryrun } from "@permaweb/aoconnect";
import { Message } from "../ao/types";
import { useMemo } from "react";
import { wellKnownTokens } from "../ao/well_known";

interface TokenBalanceItem {
  token: string;
  balance: bigint;
  owner: string;
}

export default function useTokenBalances(owner: string) {
  const {
    data: transfers = defaultGraphqlTransactions,
    fetchMore: fetchMoreTransfers
  } = useApolloQuery(GetTransfersFor, {
    variables: { process: owner }
  });
  const lastCursor = useMemo<string | undefined>(
    () => transfers.transactions.edges[transfers.transactions.edges.length - 1]?.cursor,
    [transfers]
  );
  const hasMore = useMemo(
    () => transfers.transactions.pageInfo.hasNextPage,
    [transfers]
  );

  const queryClient = useQueryClient();
  const { data } = useQuery<TokenBalanceItem[]>({
    queryKey: ["token-balances", owner, lastCursor || ""],
    queryFn: async ({ queryKey }) => {
      const oldData = (queryClient.getQueryData<TokenBalanceItem[]>(queryKey) || []).filter(
        (balanceItem) => balanceItem.owner === owner
      );

      const alreadyLoaded = new Set<string>();
      for (const balance of oldData) {
        alreadyLoaded.add(balance.token);
      }

      const tokensToLoad = transfers.transactions.edges
        .map((tx) => getTagValue("From-Process", tx.node.tags))
        .concat(Object.keys(wellKnownTokens))
        .filter((token) => !!token && !alreadyLoaded.has(token)) as string[];

      for (const token of tokensToLoad) {
        try {
          const res = await dryrun({
            process: token,
            Owner: owner,
            tags: [
              { name: "Action", value: "Balance" },
              { name: "Recipient", value: owner }
            ]
          });
          const balance = BigInt(
            getTagValue("Balance", (res.Messages as Message[])?.[0]?.Tags || []) || 0
          );

          alreadyLoaded.add(token);

          if (balance > 0n) {
            oldData.push({ token, owner, balance });
          }
        } catch {}
      }

      return oldData;
    }
  });

  async function fetchMore() {
    return fetchMoreTransfers({
      variables: {
        cursor: lastCursor
      }
    });
  }

  return { data, fetchMore, hasMore };
}
