import InfiniteScroll from "react-infinite-scroll-component";
import { formatAddress, getTagValue } from "../utils/format";
import { useContext, useEffect, useState } from "react";
import { useGateway } from "../utils/hooks";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import gql from "arweave-graphql";
import { Link } from "wouter";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, formatTimestamp } from "./process";
import { MarkedContext } from "../components/MarkedProvider";

interface MessageListItem {
  id: string;
  action: string;
  from: string;
  to: string;
  block?: number;
  time?: number;
  cursor: string;
}

export default function Home() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [hasMoreProcesses, setHasMoreProcesses] = useState(true);
  const gateway = useGateway();

  async function fetchProcesses() {
    const res = await gql(`${gateway}/graphql`).getTransactions({
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "Type", values: ["Process"] }
      ],
      first: 100,
      after: processes[processes.length - 1]?.cursor
    });

    setHasMoreProcesses(res.transactions.pageInfo.hasNextPage);
    setProcesses((val) => [
      ...val,
      ...res.transactions.edges.map((tx) => ({
        id: tx.node.id,
        name: tx.node.tags.find((tag) => tag.name === "Name")?.value || "-",
        creator: tx.node.owner.address,
        scheduler: tx.node.tags.find((tag) => tag.name === "Scheduler")?.value || "-",
        cursor: tx.cursor
      })).filter((process) => !val.find(p => p.id === process.id))
    ]);
  }

  useEffect(() => {
    fetchProcesses()
  }, []);

  const [mode, setMode] = useState<"processes" | "messages">("processes");

  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  async function fetchMessages() {
    const res = await gql(`${gateway}/graphql`).getTransactions({
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "Type", values: ["Message"] }
      ],
      first: 100,
      after: messages[messages.length - 1]?.cursor
    });

    setHasMoreMessages(res.transactions.pageInfo.hasNextPage);
    setMessages((val) => [
      ...val,
      ...res.transactions.edges.map((tx) => ({
        id: tx.node.id,
        action: getTagValue("Action", tx.node.tags) || "-",
        from: getTagValue("From-Process", tx.node.tags) || tx.node.owner.address,
        to: tx.node.recipient,
        block: tx.node.block?.height,
        time: tx.node.block?.timestamp ? tx.node.block.timestamp * 1000 : undefined,
        cursor: tx.cursor
      }))
    ]);
  }

  useEffect(() => {
    fetchMessages()
  }, []);

  const [markedProcesses] = useContext(MarkedContext);
  const [markedProcessDatas, setMarkedProcessDatas] = useState<Process[]>([]);
  const [loadingMarkedProcessDatas, setLoadingMarkedProcessDatas] = useState(false);

  useEffect(() => {
    (async () => {
      if (markedProcesses.length === 0) return;
      setLoadingMarkedProcessDatas(true);
      try {
        const res = await gql(`${gateway}/graphql`).getTransactions({
          ids: markedProcesses,
          tags: [
            { name: "Data-Protocol", values: ["ao"] },
            { name: "Type", values: ["Process"] }
          ],
          first: 100
        });

        setMarkedProcessDatas(res.transactions.edges.map((tx) => ({
          id: tx.node.id,
          name: tx.node.tags.find((tag) => tag.name === "Name")?.value || "-",
          creator: tx.node.owner.address,
          scheduler: tx.node.tags.find((tag) => tag.name === "Scheduler")?.value || "-",
          cursor: tx.cursor
        })));
      } catch {}
      setLoadingMarkedProcessDatas(false);
    })();
  }, [markedProcesses]);

  return (
    <Wrapper>
      {markedProcesses.length > 0 && (
        <>
          <p>Bookmarked processes</p>
          <Table style={{ marginBottom: "2rem" }}>
            <tr>
              <th></th>
              <th>Name</th>
              <th>ID</th>
              <th>Creator</th>
            </tr>
            {markedProcessDatas.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/process/${process.id}`}>
                    {process.name}
                  </Link>
                </td>
                <td>
                  <Link to={`#/process/${process.id}`}>
                    {formatAddress(process.id, 7)}
                  </Link>
                </td>
                <td>{formatAddress(process.creator, 7)}</td>
              </tr>
            ))}
          </Table>
          {loadingMarkedProcessDatas && <LoadingStatus>Loading...</LoadingStatus>}
        </>
      )}
      <InteractionsMenu>
        <InteractionsWrapper>
          <InteractionsMenuItem
            active={mode === "processes"}
            onClick={() => setMode("processes")}
          >
            Processes
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={mode === "messages"}
            onClick={() => setMode("messages")}
          >
            Messages
          </InteractionsMenuItem>
        </InteractionsWrapper>
      </InteractionsMenu>
      {mode === "processes" && (
        <InfiniteScroll
          dataLength={processes.length}
          next={fetchProcesses}
          hasMore={hasMoreProcesses}
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
              <th>Process ID</th>
              <th>Name</th>
              <th>Creator</th>
              <th>Scheduler</th>
            </tr>
            {processes.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/process/${process.id}`}>
                    {formatAddress(process.id, 11)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/process/${process.id}`} style={{ textOverflow: "ellipsis", maxWidth: "7rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {process.name}
                  </Link>
                </td>
                <td>{formatAddress(process.creator, 7)}</td>
                <td>{formatAddress(process.scheduler, 7)}</td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {mode === "messages" && (
        <InfiniteScroll
          dataLength={messages.length}
          next={fetchMessages}
          hasMore={hasMoreMessages}
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
              <th>Block</th>
              <th>Time</th>
            </tr>
            {messages.map((message, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/message/${message.id}`}>
                    {formatAddress(message.id, 8)}
                  </Link>
                </td>
                <td>{message.action}</td>
                <td>
                  <Link to={`#/process/${message.from}`}>
                    {formatAddress(message.from, 8)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/process/${message.to}`}>
                    {formatAddress(message.to, 8)}
                  </Link>
                </td>
                <td>
                  {message.block || ""}
                </td>
                <td>
                  {formatTimestamp(message.time)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
    </Wrapper>
  )
}

const Wrapper = styled.section`
  padding: 2rem 10vw;
`;

export const LoadingStatus = styled.p`
  text-align: center;
  margin: 1rem 0;
  color: #d4d4d4;
`;

interface Process {
  id: string;
  name: string;
  creator: string;
  scheduler: string;
  cursor: string;
}
