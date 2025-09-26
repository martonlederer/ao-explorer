import { Copy, NotFound, ProcessID, ProcessName, ProcessTitle, Space, Tables, Title, Wrapper } from "../components/Page";
import Table, { TransactionType } from "../components/Table";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { Block as BlockInterface, GetTransactionsForBlock, defaultGraphqlTransactions } from "../queries/base";
import EntityLink from "../components/EntityLink";
import prettyBytes from "pretty-bytes";
import { formatTokenQuantity, getTagValue, getTransactionType } from "../utils/format";
import { Quantity } from "ao-tokens-lite";
import { Link } from "wouter";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { formatTimestamp } from "./process";
import useGateway from "../hooks/useGateway";
import { useQuery } from "@tanstack/react-query";
import { useQuery as useApolloQuery } from "@apollo/client";

dayjs.extend(relativeTime);

export default function Block({ height }: Props) {
  const gateway = useGateway();

  const { data: block, isLoading: loadingBlock } = useQuery<BlockInterface>({
    queryKey: ["block", height.toString(), gateway],
    queryFn: async () => {
      return await (
        await fetch(`${gateway}/block/height/${height}`)
      ).json();
    },
    staleTime: 10 * 60 * 1000
  });

  const {
    data: transactions = defaultGraphqlTransactions,
    fetchMore: fetchMoreTransactions
  } = useApolloQuery(GetTransactionsForBlock, {
    variables: { block: parseInt(height) }
  });

  if (loadingBlock || !block) {
    return (
      <Wrapper>
        <NotFound>
          {(!loadingBlock && "Could not find process") || "Loading..."}
        </NotFound>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <ProcessTitle>
        Block
        <ProcessName>
          {height}
        </ProcessName>
      </ProcessTitle>
      <ProcessID>
        {block.hash}
        <Copy
          onClick={() => navigator.clipboard.writeText(block.hash)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Timestamp</td>
            <td>
              {(dayjs((block.timestamp) * 1000).format("MMM DD, YYYY hh:mm:ss")) || "Just now"}
            </td>
          </tr>
          <tr>
            <td>Miner</td>
            <td>
              <EntityLink address={block.reward_addr} />
            </td>
          </tr>
          <tr>
            <td>Transactions</td>
            <td>
              {block.txs.length.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td>Size</td>
            <td>
              {prettyBytes(parseInt(block.block_size))}
            </td>
          </tr>
          <tr>
            <td>Miner Reward</td>
            <td>
              {formatTokenQuantity(new Quantity(block.reward, 12n))}
              {" AR"}
            </td>
          </tr>
          <tr>
            <td>Last Retarget</td>
            <td>
              {(dayjs((block.last_retarget) * 1000).format("MMM DD, YYYY hh:mm:ss")) || "Just now"}
            </td>
          </tr>
          <tr>
            <td>Previous Block</td>
            <td>
              <Link to={`#/${(parseInt(height) - 1).toString()}`}>
                {parseInt(height) - 1}
              </Link>
            </td>
          </tr>
        </Table>
      </Tables>
      <Title>
        Transactions
      </Title>
      <InfiniteScroll
        dataLength={transactions.transactions.edges.length}
        next={() => fetchMoreTransactions({
          variables: {
            cursor: transactions.transactions.edges[transactions.transactions.edges.length - 1].cursor
          }
        })}
        hasMore={transactions.transactions.pageInfo.hasNextPage}
        loader={<LoadingStatus>Loading...</LoadingStatus>}
        endMessage={
          <LoadingStatus>
            You've reached the end...
          </LoadingStatus>
        }
      >
        <Table>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Action</th>
            <th>From</th>
            <th>To</th>
            <th>Time</th>
          </tr>
          {transactions.transactions.edges.map((tx, i) => (
            <tr key={i}>
              <td>
                <TransactionType>
                  {getTransactionType(tx.node.tags)}
                </TransactionType>
              </td>
              <td>
                <EntityLink address={tx.node.id} transaction={tx.node} idonly />
              </td>
              <td>
                {getTagValue("Action", tx.node.tags) || "-"}
              </td>
              <td>
                <EntityLink address={getTagValue("From-Process", tx.node.tags) || tx.node.owner.address} />
              </td>
              <td>
                <EntityLink address={tx.node.recipient} />
              </td>
              <td>
                {formatTimestamp(tx.node.block?.timestamp && tx.node.block.timestamp * 1000)}
              </td>
            </tr>
          ))}
        </Table>
      </InfiniteScroll>
      <Space />
    </Wrapper>
  );
}

interface Props {
  height: string;
}
