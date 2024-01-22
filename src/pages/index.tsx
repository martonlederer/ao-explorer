import InfiniteScroll from "react-infinite-scroll-component";
import { formatAddress } from "../utils/format";
import { useEffect, useState } from "react";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import gql from "arweave-graphql";
import { Link } from "wouter";

export default function Home() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true)

  async function fetchProcesses() {
    const res = await gql("https://arweave.net/graphql").getTransactions({
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "Type", values: ["Process"] }
      ],
      first: 100,
      after: processes[processes.length - 1]?.cursor
    });

    setHasNextPage(res.transactions.pageInfo.hasNextPage);
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

  return (
    <Wrapper>
      <InfiniteScroll
        dataLength={processes.length}
        next={fetchProcesses}
        hasMore={hasNextPage}
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
                <Link to={`#/process/${process.id}`}>
                  {process.name}
                </Link>  
              </td>
              <td>{formatAddress(process.creator, 7)}</td>
              <td>{formatAddress(process.scheduler, 7)}</td>
            </tr>
          ))}
        </Table>
      </InfiniteScroll>
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
