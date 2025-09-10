import { Copy, ProcessID, ProcessName, ProcessTitle, Space, Tables, TokenLogo, Wrapper } from "../components/Page";
import { useEffect, useState } from "react";
import { useGateway } from "../utils/hooks";
import { Quantity } from "ao-tokens-lite";
import Table, { TransactionType } from "../components/Table";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";
import { dryrun } from "@permaweb/aoconnect";
import { Tag } from "../queries/processes";
import { styled } from "@linaria/react";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, formatTimestamp } from "./process";
import { useApolloClient } from "@apollo/client";
import { FullTransactionNode, GetIncomingTransactions, GetOutgoingTransactions } from "../queries/base";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { Link } from "wouter";
import { formatAddress } from "../utils/format";
import EntityLink from "../components/EntityLink";

const ario = ARIO.mainnet();

interface TransactionListItem {
  type: "Message" | "Process" | "Module" | "Assignment" | "Bundle" | undefined;
  id: string;
  owner: string;
  target: string;
  action: string;
  block: number;
  time?: number;
  original: FullTransactionNode;
  cursor: string;
}

export default function Wallet({ address }: Props) {
  const gateway = useGateway();
  const [arBalance, setArBalance] = useState("0");

  useEffect(() => {
    (async () => {
      setArBalance("0");

      const res = await (
        await fetch(`${gateway}/wallet/${address}/balance`)
      ).text();
      const balanceQty = new Quantity(res || "0", 12n);

      setArBalance(balanceQty.toLocaleString(undefined, {
        maximumFractionDigits: Quantity.lt(balanceQty, new Quantity(1n, 0n)) ? 12 : 4
      }));
    })();
  }, [address, gateway]);

  const [aoBalance, setAoBalance] = useState("0");

  useEffect(() => {
    (async () => {
      setAoBalance("0");

      const res = await dryrun({
        process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc",
        Owner: address,
        tags: [
          { name: "Action", value: "Balance" },
          { name: "Recipient", value: address }
        ]
      });
      if (!res.Messages[0]) return;
      const balanceQty = new Quantity(res.Messages[0].Tags.find((t: Tag) => t.name === "Balance")?.value || "0", 12n);

      setAoBalance(balanceQty.toLocaleString(undefined, {
        maximumFractionDigits: Quantity.lt(balanceQty, new Quantity(1n, 0n)) ? 12 : 4
      }));
    })();
  }, [address]);

  const [arnsName, setArnsName] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setArnsName(undefined);
        const res = await ario.getPrimaryName({ address });
        setArnsName(res?.name);
      } catch {}
    })();
  }, [address]);

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing" | "spawns" | "transfers" | "balances">("incoming");

  const client = useApolloClient();

  const [hasMoreOutgoing, setHasMoreOutgoing] = useState(true);
  const [outgoing, setOutgoing] = useState<TransactionListItem[]>([]);

  async function fetchOutgoing() {
    const res = await client.query({
      query: GetOutgoingTransactions,
      variables: {
        owner: address,
        cursor: outgoing[outgoing.length - 1]?.cursor
      }
    });

    setHasMoreOutgoing(res.data.transactions.pageInfo.hasNextPage);
    setOutgoing((val) => {
      // manually filter out duplicate transactions
      // for some reason, the ar.io nodes return the
      // same transaction multiple times for certain
      // queries
      for (const tx of res.data.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
        val.push({
          // @ts-expect-error
          type: tx.node.tags.find((tag) => tag.name === "Type")?.value || "Transaction",
          id: tx.node.id,
          owner: tx.node.owner.address,
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
    setOutgoing([]);
    setHasMoreOutgoing(true);
    fetchOutgoing();
  }, [address, gateway]);

  const [hasMoreIncoming, setHasMoreIncoming] = useState(true);
  const [incoming, setIncoming] = useState<TransactionListItem[]>([]);

  async function fetchIncoming() {
    const res = await client.query({
      query: GetIncomingTransactions,
      variables: {
        recipient: address,
        cursor: incoming[incoming.length - 1]?.cursor
      }
    });

    setHasMoreIncoming(res.data.transactions.pageInfo.hasNextPage);
    setIncoming((val) => {
      // manually filter out duplicate transactions
      // for some reason, the ar.io nodes return the
      // same transaction multiple times for certain
      // queries
      for (const tx of res.data.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
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
    setIncoming([]);
    setHasMoreIncoming(true);
    fetchIncoming();
  }, [address, gateway]);

  return (
    <Wrapper>
      <ProcessTitle>
        Wallet
        {arnsName && (
          <ProcessName>
            {arnsName}
            <TokenLogo src="/arns.svg" draggable={false} />
          </ProcessName>
        )}
      </ProcessTitle>
      <ProcessID>
        {address}
        <Copy
          onClick={() => navigator.clipboard.writeText(address)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Arweave Balance</td>
            <td>
              <Balance>
                {arBalance}
                {" AR"}
                <TokenLogo src="/ar.png" draggable={false} />
              </Balance>
            </td>
          </tr>
          <tr>
            <td>AO Balance</td>
            <td>
              <Balance>
                {aoBalance}
                {" AO"}
                <TokenLogo src={`${gateway}/UkS-mdoiG8hcAClhKK8ch4ZhEzla0mCPDOix9hpdSFE}`} draggable={false} />
              </Balance>
            </td>
          </tr>
        </Table>
      </Tables>
      <Space y={1.5} />
      <InteractionsMenu>
        <InteractionsWrapper>
          <InteractionsMenuItem
            active={interactionsMode === "incoming"}
            onClick={() => setInteractionsMode("incoming")}
          >
            Incoming
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "outgoing"}
            onClick={() => setInteractionsMode("outgoing")}
          >
            Outgoing
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "spawns"}
            onClick={() => setInteractionsMode("spawns")}
          >
            Processes
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "transfers"}
            onClick={() => setInteractionsMode("transfers")}
          >
            Transfers
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={interactionsMode === "balances"}
            onClick={() => setInteractionsMode("balances")}
          >
            Balances
          </InteractionsMenuItem>
        </InteractionsWrapper>
      </InteractionsMenu>
      {interactionsMode === "outgoing" && (
        <InfiniteScroll
          dataLength={outgoing.length}
          next={fetchOutgoing}
          hasMore={hasMoreOutgoing}
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
              <th>To</th>
              <th>Block</th>
              <th>Time</th>
            </tr>
            {outgoing.map((tx, i) => (
              <tr key={i}>
                <td>
                  <TransactionType>
                    {tx.type}
                  </TransactionType>
                </td>
                <td>
                  <EntityLink address={tx.id} transaction={tx.original} />
                </td>
                <td>
                  {tx.action}
                </td>
                <td>
                  {(tx.target && <EntityLink address={tx.target} />) || "-"}
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
      )}
      {interactionsMode === "incoming" && (
        <InfiniteScroll
          dataLength={incoming.length}
          next={fetchIncoming}
          hasMore={hasMoreIncoming}
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
            {incoming.map((tx, i) => (
              <tr key={i}>
                <td>
                  <TransactionType>
                    {tx.type}
                  </TransactionType>
                </td>
                <td>
                  <EntityLink address={tx.id} transaction={tx.original} />
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
      )}
      <Space />
    </Wrapper>
  );
}

const Balance = styled.div`
  display: flex;
  align-items: center;
  gap: .35rem;
`;

interface Props {
  address: string;
}
