import { Copy, NotFound, ProcessID, ProcessName, ProcessTitle, Space, Tables, Title, Wrapper } from "../components/Page";
import Table, { TransactionType } from "../components/Table";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Block as BlockInterface, GetTransactionsForBlock } from "../queries/base";
import { useGateway } from "../utils/hooks";
import EntityLink from "../components/EntityLink";
import prettyBytes from "pretty-bytes";
import { formatTokenQuantity } from "../utils/format";
import { Quantity } from "ao-tokens-lite";
import { Link } from "wouter";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { formatTimestamp } from "./process";
import { TransactionListItem } from "./wallet";
import { useApolloClient } from "@apollo/client";

dayjs.extend(relativeTime);

export default function Block({ height }: Props) {
  const [block, setBlock] = useState<BlockInterface | undefined>(undefined);
  const [loadingBlock, setLoadingBlock] = useState(true);
  const gateway = useGateway();

  useEffect(() => {
    (async () => {
      setLoadingBlock(true);

      try {
        const res = await (
          await fetch(`${gateway}/block/height/${height}`)
        ).json();

        setBlock(res);
      } catch {}

      setLoadingBlock(false);
    })();
  }, [height, gateway]);

  const client = useApolloClient();

  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);

  async function fetchTransactions() {
    const res = await client.query({
      query: GetTransactionsForBlock,
      variables: {
        block: parseInt(height),
        cursor: transactions[transactions.length - 1]?.cursor
      }
    });

    setHasMoreTransactions(res.data.transactions.pageInfo.hasNextPage);
    setTransactions((val) => {
      // manually filter out duplicate transactions
      // for some reason, the ar.io nodes return the
      // same transaction multiple times for certain
      // queries
      for (const tx of res.data.transactions.edges) {
        val.push({
          // @ts-expect-error
          type: tx.node.tags.find((tag) => tag.name === "Type")?.value || "Transaction",
          id: tx.node.id,
          owner: tx.node.tags.find((tag) => tag.name === "From-Process")?.value || tx.node.owner.address,
          target: tx.node.recipient,
          action: tx.node.tags.find((tag) => tag.name === "Action")?.value || "-",
          block: tx.node.block?.height || 0,
          time: tx.node.block?.timestamp,
          original: tx.node,
          cursor: tx.cursor
        });
      }

      return val;
    });
  }

  useEffect(() => {
    setTransactions([]);
    setHasMoreTransactions(true);
    fetchTransactions();
  }, [height]);

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
        dataLength={transactions.length}
        next={fetchTransactions}
        hasMore={hasMoreTransactions}
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
            <th>Block</th>
            <th>Time</th>
          </tr>
          {transactions.map((tx, i) => (
            <tr key={i}>
              <td>
                <TransactionType>
                  {tx.type}
                </TransactionType>
              </td>
              <td>
                <EntityLink address={tx.id} transaction={tx.original} idonly />
              </td>
              <td>
                {tx.action}
              </td>
              <td>
                <EntityLink address={tx.owner} />
              </td>
              <td>
                {tx.block}
              </td>
              <td>
                {formatTimestamp(tx.time && tx.time * 1000)}
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
