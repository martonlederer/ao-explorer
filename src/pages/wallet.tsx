import { Copy, ProcessID, ProcessName, ProcessTitle, Space, Tables, TokenLogo, Wrapper } from "../components/Page";
import { useState } from "react";
import { Quantity } from "ao-tokens-lite";
import Table, { TransactionType } from "../components/Table";
import { dryrun } from "@permaweb/aoconnect";
import { GetOwnedProcesses } from "../queries/processes";
import { styled } from "@linaria/react";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, TokenIcon, TokenTicker, formatTimestamp } from "./process";
import { useQuery as useApolloQuery } from "@apollo/client";
import { FullTransactionNode, GetIncomingTransactions, GetOutgoingTransactions, defaultGraphqlTransactions } from "../queries/base";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { Link } from "wouter";
import { formatAddress, formatQuantity, formatTokenQuantity, getTagValue, getTransactionType } from "../utils/format";
import EntityLink from "../components/EntityLink";
import { GetTransfersFor } from "../queries/messages";
import { Message } from "../ao/types";
import useGateway from "../hooks/useGateway";
import { useQuery } from "@tanstack/react-query";
import usePrimaryName from "../hooks/usePrimaryName";
import TransferAmount from "../components/TransferAmount";
import useTokenBalances from "../hooks/useTokenBalances";

export interface TransactionListItem {
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

  const { data: arBalance = "0" } = useQuery({
    queryKey: ["wallet-balance-ar", address, gateway],
    queryFn: async () => {
      const res = await (
        await fetch(`${gateway}/wallet/${address}/balance`)
      ).text();
      const balanceQty = new Quantity(res || "0", 12n);

      return formatTokenQuantity(balanceQty);
    },
    select: (val) => val || "0",
    staleTime: 3 * 60 * 1000
  });

  const { data: aoBalance = "0" } = useQuery({
    queryKey: ["wallet-balance-ao", address, gateway],
    queryFn: async () => {
      const res = await dryrun({
        process: "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc",
        Owner: address,
        tags: [
          { name: "Action", value: "Balance" },
          { name: "Recipient", value: address }
        ]
      });

      for (const msg of res.Messages as Message[]) {
        const rawQty = getTagValue("Balance", msg.Tags);
        if (!rawQty) continue;
        const qty = new Quantity(rawQty, 12n);

        return formatTokenQuantity(qty);
      }

      return "0";
    },
    select: (val) => val || "0",
    staleTime: 3 * 60 * 1000
  });

  const { data: arnsName } = usePrimaryName(address);

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing" | "spawns" | "transfers" | "balances">("incoming");

  const {
    data: outgoing = defaultGraphqlTransactions,
    fetchMore: fetchMoreOutgoing
  } = useApolloQuery(GetOutgoingTransactions, { variables: { owner: address } });

  const {
    data: incoming = defaultGraphqlTransactions,
    fetchMore: fetchMoreIncoming
  } = useApolloQuery(GetIncomingTransactions, { variables: { recipient: address } });

  const {
    data: processes = defaultGraphqlTransactions,
    fetchMore: fetchMoreProcesses
  } = useApolloQuery(GetOwnedProcesses, { variables: { owner: address } });

  const {
    data: transfers = defaultGraphqlTransactions,
    fetchMore: fetchMoreTransfers
  } = useApolloQuery(GetTransfersFor, { variables: { process: address } });

  const {
    data: balances = [],
    fetchMore: fetchMoreBalances,
    hasMore: hasMoreBalances
  } = useTokenBalances(address);

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
          dataLength={outgoing.transactions.edges.length}
          next={() => fetchMoreOutgoing({
            variables: {
              cursor: outgoing.transactions.edges[outgoing.transactions.edges.length - 1].cursor
            }
          })}
          hasMore={outgoing.transactions.pageInfo.hasNextPage}
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
            {outgoing.transactions.edges.map((tx, i) => (
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
                  {(tx.node.recipient && <EntityLink address={tx.node.recipient} />) || "-"}
                </td>
                <td>
                  {(tx.node.block?.height && <Link to={`#/${tx.node.block.height}`}>{tx.node.block.height}</Link>) || "Pending..."}
                </td>
                <td>
                  {formatTimestamp(tx.node.block?.timestamp && tx.node.block.timestamp * 1000)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {interactionsMode === "incoming" && (
        <InfiniteScroll
          dataLength={incoming.transactions.edges.length}
          next={() => fetchMoreIncoming({
            variables: {
              cursor: incoming.transactions.edges[incoming.transactions.edges.length - 1].cursor
            }
          })}
          hasMore={incoming.transactions.pageInfo.hasNextPage}
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
            {incoming.transactions.edges.map((tx, i) => (
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
                  {(tx.node.block?.height && <Link to={`#/${tx.node.block.height}`}>{tx.node.block.height}</Link>) || "Pending..."}
                </td>
                <td>
                  {formatTimestamp(tx.node.block?.timestamp && tx.node.block.timestamp * 1000)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {interactionsMode === "spawns" && (
        <InfiniteScroll
          dataLength={processes.transactions.edges.length}
          next={() => fetchMoreProcesses({
            variables: {
              cursor: processes.transactions.edges[processes.transactions.edges.length - 1].cursor
            }
          })}
          hasMore={processes.transactions.pageInfo.hasNextPage}
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
            {processes.transactions.edges.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${process.node.id}`} style={{ textOverflow: "ellipsis", maxWidth: "17rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {getTagValue("Name", process.node.tags)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${process.node.id}`}>
                    {formatAddress(process.node.id, 7)}
                  </Link>
                </td>
                <td>
                  <EntityLink address={getTagValue("Module", process.node.tags) || ""} />
                </td>
                <td>
                  {(process.node.block?.height && <Link to={`#/${process.node.block.height}`}>{process.node.block.height}</Link>) || ""}
                </td>
                <td>
                  {formatTimestamp(process.node.block?.timestamp && process.node.block.timestamp * 1000)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {interactionsMode === "transfers" && (
        <InfiniteScroll
          dataLength={transfers.transactions.edges.length}
          next={() => fetchMoreTransfers({
            variables: {
              cursor: transfers.transactions.edges[transfers.transactions.edges.length - 1].cursor
            }
          })}
          hasMore={transfers.transactions.pageInfo.hasNextPage}
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
            {transfers.transactions.edges.map((transfer, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${transfer.node.id}`}>
                    {formatAddress(transfer.node.id)}
                  </Link>
                  {/*{<EntityLink address={transfer.id} transaction={transfer.original} idonly />}*/}
                </td>
                <td>
                  <EntityLink address={getTagValue("Sender", transfer.node.tags) || transfer.node.recipient} />
                </td>
                <td>
                  <EntityLink address={getTagValue("Recipient", transfer.node.tags) || transfer.node.recipient} />
                </td>
                <td>
                  <TransferAmount
                    token={getTagValue("Forwarded-For", transfer.node.tags) || getTagValue("From-Process", transfer.node.tags) || transfer.node.owner.address}
                    quantity={getTagValue("Quantity", transfer.node.tags) || "0"}
                    direction={getTagValue("Action", transfer.node.tags) === "Credit-Notice" ? "in" : "out"}
                  />
                </td>
                <td>
                  {formatTimestamp(transfer.node.block?.timestamp ? transfer.node.block.timestamp * 1000 : undefined)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {interactionsMode === "balances" && (
        <InfiniteScroll
          dataLength={balances.length}
          next={fetchMoreBalances}
          hasMore={hasMoreBalances}
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
              <th>Token name</th>
              <th>Balance</th>
            </tr>
            {balances.map((balance, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${balance.token}`}>
                    {balance.token}
                  </Link>
                </td>
                <td>
                  {balance.balance.toString()}
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

interface Process {
  id: string;
  name: string;
  module: string;
  cursor: string;
  block?: number;
  time?: number;
}
