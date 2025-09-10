import { Copy, ProcessID, ProcessName, ProcessTitle, Space, Tables, TokenLogo, Wrapper } from "../components/Page";
import { useEffect, useState } from "react";
import { useGateway } from "../utils/hooks";
import { Quantity } from "ao-tokens-lite";
import Table, { TransactionType } from "../components/Table";
// @ts-expect-error
import { ARIO } from "@ar.io/sdk/web";
import { dryrun } from "@permaweb/aoconnect";
import { GetOwnedProcesses, Tag } from "../queries/processes";
import { styled } from "@linaria/react";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, TokenIcon, TokenTicker, formatTimestamp } from "./process";
import { useApolloClient } from "@apollo/client";
import { FullTransactionNode, GetIncomingTransactions, GetOutgoingTransactions } from "../queries/base";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { Link } from "wouter";
import { formatAddress, formatQuantity, getTagValue } from "../utils/format";
import EntityLink from "../components/EntityLink";
import { wellKnownTokens } from "../ao/well_known";
import { GetTransfersFor, TransactionNode } from "../queries/messages";
import { Message } from "./interaction";

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

  const [ownedProcesses, setOwnedProcesses] = useState<Process[]>([]);
  const [hasMoreOwnedProcesses, setHasMoreOwnedProcesses] = useState(true);

  async function fetchOwnedProcesses() {
    if (!address) return;
    const res = await client.query({
      query: GetOwnedProcesses,
      variables: {
        owner: address,
        cursor: ownedProcesses[ownedProcesses.length - 1]?.cursor
      }
    });

    setHasMoreOwnedProcesses(res.data.transactions.pageInfo.hasNextPage);
    setOwnedProcesses((val) => [
      ...val,
      ...res.data.transactions.edges.map((tx) => ({
        id: tx.node.id,
        name: tx.node.tags.find((tag) => tag.name === "Name")?.value || "-",
        module: tx.node.tags.find((tag) => tag.name === "Module")?.value || "-",
        block: tx.node.block?.height,
        time: tx.node.block?.timestamp,
        cursor: tx.cursor
      })).filter((process) => !val.find(p => p.id === process.id))
    ]);
  }

  useEffect(() => {
    setOwnedProcesses([]);
    fetchOwnedProcesses();
  }, [address]);

  const [cachedTokens, setCachedTokens] = useState<Record<string, { name: string; ticker: string; denomination: bigint; logo: string; } | "pending">>(wellKnownTokens);
  const [transfers, setTransfers] = useState<{ id: string; dir: "in" | "out"; from: string; to: string; quantity: string; token: string; time?: number; original: Omit<TransactionNode, "recipient">; cursor: string; }[]>([]);
  const [hasMoreTransfers, setHasMoreTransfers] = useState(true);

  async function fetchTransfers() {
    const res = await client.query({
      query: GetTransfersFor,
      variables: {
        process: address,
        cursor: transfers[transfers.length - 1]?.cursor
      }
    });

    setHasMoreTransfers(res.data.transactions.pageInfo.hasNextPage);
    setTransfers((val) => {
      for (const tx of res.data.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
        const dir = getTagValue("Action", tx.node.tags) === "Credit-Notice" ? "in" : "out";
        const token = getTagValue("Forwarded-For", tx.node.tags) || getTagValue("From-Process", tx.node.tags) || tx.node.owner.address;

        cacheToken(token);
        val.push({
          id: tx.node.id,
          dir,
          from: dir === "in" ? getTagValue("Sender", tx.node.tags) || "" : address,
          to: dir === "out" ? getTagValue("Recipient", tx.node.tags) || "" : address,
          quantity: getTagValue("Quantity", tx.node.tags) || "0",
          token,
          time: tx.node.block?.timestamp,
          original: tx.node,
          cursor: tx.cursor
        });
      }

      return val;
    });
  }

  async function cacheToken(token: string) {
    if (cachedTokens[token]) return;
    setCachedTokens((val) => {
      val[token] = "pending";
      return val;
    });

    try {
      const res: Message | undefined = (await dryrun({
        process: token,
        tags: [{ name: "Action", value: "Info" }]
      })).Messages.find((msg: Message) => !!getTagValue("Ticker", msg.Tags));

      if (!res) return;
      setCachedTokens((val) => {
        val[token] = {
          name: getTagValue("Name", res.Tags) || getTagValue("Ticker", res.Tags) || "",
          ticker: getTagValue("Ticker", res.Tags) || "",
          denomination: BigInt(getTagValue("Denomination", res.Tags) || 0),
          logo: getTagValue("Logo", res.Tags) || ""
        };
        return val;
      });
    } catch {}
  }

  useEffect(() => {
    setTransfers([]);
    setHasMoreTransfers(true);
    fetchTransfers();
  }, [address, gateway]);

  const [tokenBalances, setTokenBalances] = useState<{ token: string; balance: bigint; }[]>([]);
  const [loadingTokenBalances, setLoadingTokenBalances] = useState(true);

  async function fetchTokenBalances() {
    setLoadingTokenBalances(true);
    try {
      const res = await Promise.all(Object.entries(cachedTokens).filter(([id]) => !tokenBalances.find((bal) => bal.token === id)).map(
        async ([tokenId]) => {
          try {
            const dryRunRes = await dryrun({
              process: tokenId,
              Owner: address,
              tags: [
                { name: "Action", value: "Balance" },
                { name: "Recipient", value: address }
              ]
            });

            return {
              messages: dryRunRes.Messages,
              token: tokenId
            };
          } catch {
            return undefined;
          }
        }
      ));

      setTokenBalances((val) => {
        for (const balRes of res) {
          if (!balRes || !!val.find((t) => t.token === balRes.token)) continue;
          const balanceMsg: Message = balRes.messages.find(
            (msg: Message) => !!getTagValue("Balance", msg.Tags)
          );
          const balance = BigInt(getTagValue("Balance", balanceMsg.Tags) || 0);

          if (balance > 0n) {
            val.push({
              token: balRes.token,
              balance
            });
          }
        }

        return val;
      });
    } catch {}
    setLoadingTokenBalances(false);
  }

  useEffect(() => {
    setTokenBalances([]);
    fetchTokenBalances();
  }, [address]);
  useEffect(() => {
    fetchTokenBalances();
  }, [cachedTokens]);

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
      {interactionsMode === "spawns" && (
        <InfiniteScroll
          dataLength={ownedProcesses.length}
          next={fetchOwnedProcesses}
          hasMore={hasMoreOwnedProcesses}
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
              <th>Name</th>
              <th>Process ID</th>
              <th>Module</th>
              <th>Block</th>
              <th>Time</th>
            </tr>
            {ownedProcesses.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${process.id}`} style={{ textOverflow: "ellipsis", maxWidth: "17rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {process.name}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${process.id}`}>
                    {formatAddress(process.id, 7)}
                  </Link>
                </td>
                <td>
                  <EntityLink address={process.module} />
                </td>
                <td>
                  {process.block || ""}
                </td>
                <td>
                  {formatTimestamp(process.time && process.time * 1000)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {interactionsMode === "transfers" && (
        <InfiniteScroll
          dataLength={transfers.length}
          next={fetchTransfers}
          hasMore={hasMoreTransfers}
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
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Time</th>
            </tr>
            {transfers.map((transfer, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${transfer.id}`}>
                    {formatAddress(transfer.id)}
                  </Link>
                  {/*{<EntityLink address={transfer.id} transaction={transfer.original} />}*/}
                </td>
                <td>
                  <EntityLink address={transfer.from} />
                </td>
                <td>
                  <EntityLink address={transfer.to} />
                </td>
                <td>
                  <Link to={`#/${transfer.token}`}>
                    <span style={{ color: transfer.dir === "out" ? "#ff0000" : "#00db5f" }}>
                      {transfer.dir === "out" ? "-" : "+"}
                      {//@ts-expect-error
                        formatQuantity(new Quantity(transfer.quantity, cachedTokens[transfer.token] !== "pending" ? cachedTokens[transfer.token]?.denomination || 12n : 12n))}
                    </span>
                    {typeof cachedTokens[transfer.token] !== "undefined" && cachedTokens[transfer.token] !== "pending" && (
                      <TokenTicker>
                        <TokenIcon src={`${gateway}/${(cachedTokens[transfer.token] as any).logo}`} draggable={false} />
                        {(cachedTokens[transfer.token] as any).ticker}
                      </TokenTicker>
                    )}
                  </Link>
                </td>
                <td>
                  {formatTimestamp(transfer.time ? transfer.time * 1000 : undefined)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {interactionsMode === "balances" && (
        <>
          <Table>
            <tr>
              <th></th>
              <th>Token name</th>
              <th>Balance</th>
            </tr>
            {tokenBalances.map((balance, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${balance.token}`}>
                    {//@ts-expect-error
                      (cachedTokens[balance.token] !== "pending" && cachedTokens[balance.token]?.name) || formatAddress(balance.token)}
                  </Link>
                </td>
                <td style={{ display: "flex", alignItems: "center" }}>
                  <span>
                    {// @ts-expect-error
                      formatQuantity(new Quantity(balance.balance, (cachedTokens[balance.token] !== "pending" && cachedTokens[balance.token]?.denomination) || 12n))}
                  </span>
                  {cachedTokens[balance.token] && cachedTokens[balance.token] !== "pending" && (
                    <TokenTicker>
                      <TokenIcon src={`${gateway}/${(cachedTokens[balance.token] as any).logo}`} draggable={false} />
                      {(cachedTokens[balance.token] as any).ticker}
                    </TokenTicker>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          {loadingTokenBalances && <LoadingStatus>Loading...</LoadingStatus>}
          {!loadingTokenBalances && tokenBalances.length === 0 && !hasMoreTransfers && (
            <LoadingStatus>
              No balances
            </LoadingStatus>
          )}
        </>
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

interface Process {
  id: string;
  name: string;
  module: string;
  cursor: string;
  block?: number;
  time?: number;
}
