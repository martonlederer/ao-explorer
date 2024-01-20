import InfiniteScroll from "react-infinite-scroll-component";
import { styled } from "@linaria/react";
import gql from "arweave-graphql";
import { useEffect, useState } from "react";
import { formatAddress } from "../utils/format"
import { Link } from "wouter"

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
      }))
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
        hasMore={false}
        loader={<h4>Loading...</h4>}
        endMessage={
          <LoadingStatus>
            You've reached the end...
          </LoadingStatus>
        }
      >
        <Transactions>
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
        </Transactions>
      </InfiniteScroll>
    </Wrapper>
  )
}

const Wrapper = styled.section`
  padding: 2rem 10vw;
`;

const Transactions = styled.table`
  border-collapse: collapse;
  width: 100%;

  td, th {
    border-left: none;
    border-right: none;
    text-align: left;
    padding: 1.05rem .7rem;
    font-weight: 400;
  }

  th {
    font-weight: 500;
  }

  td {
    color: rgba(255, 255, 255, .85);
  }

  tr:nth-child(even) {
    background-color: rgba(255, 255, 255, .05);
  }

  a {
    color: inherit;
    text-decoration: none;
    display: block;
  }
`;

const LoadingStatus = styled.p`
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
