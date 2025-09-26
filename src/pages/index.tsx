import InfiniteScroll from "react-infinite-scroll-component";
import { formatAddress, getTagValue } from "../utils/format";
import { useContext, useState } from "react";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import { Link } from "wouter";
import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, formatTimestamp } from "./process";
import { MarkedContext } from "../components/MarkedProvider";
import { BookmarkIcon } from "@iconicicons/react";
import { useActiveAddress } from "@arweave-wallet-kit/react";
import { GetAllMessages } from "../queries/messages";
import { GetAllProcesses, GetBookmarkedProcesses, GetOwnedProcesses } from "../queries/processes";
import { useQuery as useApolloQuery } from "@apollo/client";
import { defaultGraphqlTransactions } from "../queries/base";
import EntityLink from "../components/EntityLink";

export default function Home() {
  const {
    data: processes = defaultGraphqlTransactions,
    fetchMore: fetchMoreProcesses
  } = useApolloQuery(GetAllProcesses);

  const address = useActiveAddress();
  const {
    data: ownedProcesses = defaultGraphqlTransactions,
    fetchMore: fetchMoreOwnedProcesses
  } = useApolloQuery(GetOwnedProcesses, {
    variables: { owner: address! },
    skip: typeof address === "undefined"
  });

  const {
    data: messages = defaultGraphqlTransactions,
    fetchMore: fetchMoreMessages
  } = useApolloQuery(GetAllMessages);

  const [mode, setMode] = useState<"processes" | "messages" | "owned_processes">("processes");

  const [markedProcesses] = useContext(MarkedContext);
  const {
    data: markedProcessDatas = defaultGraphqlTransactions,
    loading: loadingMarkedProcessDatas
  } = useApolloQuery(GetBookmarkedProcesses, {
    variables: {
      marked: markedProcesses
    }
  });

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
              <th>Module</th>
            </tr>
            {markedProcessDatas.transactions.edges.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${process.node.id}`}>
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
          dataLength={ownedProcesses.transactions.edges.length}
          next={() => fetchMoreOwnedProcesses({
            variables: {
              cursor: ownedProcesses.transactions.edges[ownedProcesses.transactions.edges.length - 1].cursor
            }
          })}
          hasMore={ownedProcesses.transactions.pageInfo.hasNextPage}
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
            {ownedProcesses.transactions.edges.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${process.node.id}`} style={{ textOverflow: "ellipsis", maxWidth: "17rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {getTagValue("Name", process.node.tags) || "-"}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${process.node.id}`}>
                    {formatAddress(process.node.id, 7)}
                  </Link>
                </td>
                <td>{formatAddress(getTagValue("From-Process", process.node.tags) || process.node.owner.address, 7)}</td>
                <td>
                  <EntityLink address={getTagValue("Module", process.node.tags) || ""} />
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {mode === "processes" && (
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
              <th>Creator</th>
              <th>Module</th>
            </tr>
            {processes.transactions.edges.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${process.node.id}`} style={{ textOverflow: "ellipsis", maxWidth: "17rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {getTagValue("Name", process.node.tags) || "-"}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${process.node.id}`}>
                    {formatAddress(process.node.id, 7)}
                  </Link>
                </td>
                <td>{formatAddress(getTagValue("From-Process", process.node.tags) || process.node.owner.address, 7)}</td>
                <td>
                  <EntityLink address={getTagValue("Module", process.node.tags) || ""} />
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
      {mode === "messages" && (
        <InfiniteScroll
          dataLength={messages.transactions.edges.length}
          next={() => fetchMoreMessages({
            variables: {
              cursor: messages.transactions.edges[messages.transactions.edges.length - 1].cursor
            }
          })}
          hasMore={messages.transactions.pageInfo.hasNextPage}
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
            {messages.transactions.edges.map((message, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${message.node.id}`}>
                    {formatAddress(message.node.id, 8)}
                  </Link>
                </td>
                <td>{getTagValue("Action", message.node.tags) || "-"}</td>
                <td>
                  <Link to={`#/${getTagValue("From-Process", message.node.tags) || message.node.owner.address}`}>
                    {formatAddress(getTagValue("From-Process", message.node.tags) || message.node.owner.address, 8)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/${message.node.recipient}`}>
                    {formatAddress(message.node.recipient, 8)}
                  </Link>
                </td>
                <td>
                  {(message.node.block?.height && <Link to={`#/${message.node.block?.height}`}>{message.node.block?.height}</Link>) || ""}
                </td>
                <td>
                  {formatTimestamp(message.node.block?.timestamp ? message.node.block.timestamp * 1000 : undefined)}
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
