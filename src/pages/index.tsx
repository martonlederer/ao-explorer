import InfiniteScroll from "react-infinite-scroll-component";
import { formatAddress, getTagValue } from "../utils/format";
import { useContext, useEffect, useState } from "react";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import { Link } from "wouter";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, formatTimestamp } from "./process";
import { MarkedContext } from "../components/MarkedProvider";
import { BookmarkIcon } from "@iconicicons/react";
import { useActiveAddress } from "@arweave-wallet-kit/react";
import { GetAllMessages } from "../queries/messages";
import { GetAllProcesses, GetBookmarkedProcesses, GetOwnedProcesses } from "../queries/processes";
import { useApolloClient } from "@apollo/client";

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
  const client = useApolloClient();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [hasMoreProcesses, setHasMoreProcesses] = useState(true);

  async function fetchProcesses() {
    const res = await client.query({
      query: GetAllProcesses,
      variables: {
        cursor: processes[processes.length - 1]?.cursor
      }
    });

    setHasMoreProcesses(res.data.transactions.pageInfo.hasNextPage);
    setProcesses((val) => [
      ...val,
      ...res.data.transactions.edges.map((tx) => ({
        id: tx.node.id,
        name: tx.node.tags.find((tag) => tag.name === "Name")?.value || "-",
        creator: tx.node.owner.address,
        scheduler: tx.node.tags.find((tag) => tag.name === "Scheduler")?.value || "-",
        cursor: tx.cursor
      })).filter((process) => !val.find(p => p.id === process.id))
    ]);
  }

  useEffect(() => {
    fetchProcesses();
  }, []);

  const address = useActiveAddress();
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
        creator: tx.node.owner.address,
        scheduler: tx.node.tags.find((tag) => tag.name === "Scheduler")?.value || "-",
        cursor: tx.cursor
      })).filter((process) => !val.find(p => p.id === process.id))
    ]);
  }

  useEffect(() => {
    setOwnedProcesses([]);
    fetchOwnedProcesses();
  }, [address]);

  const [mode, setMode] = useState<"processes" | "messages" | "owned_processes">("processes");

  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  async function fetchMessages() {
    const res = await client.query({
      query: GetAllMessages,
      variables: {
        cursor: messages[messages.length - 1]?.cursor
      }
    });

    setHasMoreMessages(res.data.transactions.pageInfo.hasNextPage);
    setMessages((val) => [
      ...val,
      ...res.data.transactions.edges.map((tx) => ({
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
        const res = await client.query({
          query: GetBookmarkedProcesses,
          variables: {
            marked: markedProcesses
          }
        });

        setMarkedProcessDatas(res.data.transactions.edges.map((tx) => ({
          id: tx.node.id,
          name: tx.node.tags.find((tag) => tag.name === "Name")?.value || "-",
          creator: tx.node.owner.address,
          scheduler: tx.node.tags.find((tag) => tag.name === "Scheduler")?.value || "-",
          cursor: tx.cursor
        })));
      } catch {}
      setLoadingMarkedProcessDatas(false);
    })();
  }, [markedProcesses, client]);

  return (
    <Wrapper>
      {markedProcesses.length > 0 && (
        <>
          <SmallTitle>
            <BookmarkIcon />
            Bookmarked processes
          </SmallTitle>
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
                  <Link to={`#/${process.id}`}>
                    {process.name}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${process.id}`}>
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
      {/*<SmallTitle>
        <RewindIcon />
        Recently interacted with
        </SmallTitle>*/}
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
          {address && (
            <InteractionsMenuItem
              active={mode === "owned_processes"}
              onClick={() => setMode("owned_processes")}
            >
              Your processes
            </InteractionsMenuItem>
          )}
        </InteractionsWrapper>
      </InteractionsMenu>
      {mode === "owned_processes" && (
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
              <th>Creator</th>
              <th>Scheduler</th>
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
                <td>{formatAddress(process.creator, 7)}</td>
                <td>{formatAddress(process.scheduler, 7)}</td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
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
              <th>Name</th>
              <th>Process ID</th>
              <th>Creator</th>
              <th>Scheduler</th>
            </tr>
            {processes.map((process, i) => (
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
                  <Link to={`#/${message.id}`}>
                    {formatAddress(message.id, 8)}
                  </Link>
                </td>
                <td>{message.action}</td>
                <td>
                  <Link to={`#/${message.from}`}>
                    {formatAddress(message.from, 8)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${message.to}`}>
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

const SmallTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: .4rem;
  color: #fff;
  margin: 0 0 1rem 0;
  font-weight: 500;

  svg {
    width: 1.25em;
    height: 1.25em;
  }
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
