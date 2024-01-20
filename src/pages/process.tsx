import InfiniteScroll from "react-infinite-scroll-component";
import arGql, { TransactionEdge } from "arweave-graphql";
import { useEffect, useMemo, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import { formatAddress } from "../utils/format";
import { styled } from "@linaria/react";
import { LoadingStatus } from "./index";
import Table from "../components/Table";
import dayjs from "dayjs";

dayjs.extend(relativeTime);

export default function Process({ id }: Props) {
  const [initTx, setInitTx] = useState<TransactionEdge | "loading">("loading");

  useEffect(() => {
    (async () => {
      setInitTx("loading");
      const res = await arGql("https://arweave.net/graphql").getTransactions({
        ids: [id]
      });

      setInitTx(res.transactions.edges[0] as TransactionEdge);
    })();
  }, [id]);

  const tags = useMemo(() => {
    const tagRecord: { [name: string]: string } = {};

    if (!initTx || initTx == "loading")
      return tagRecord;

    for (const tag of initTx.node.tags) {
      tagRecord[tag.name] = tag.value
    }

    return tagRecord;
  }, [initTx]);

  const [schedulerURL, setSchedulerURL] = useState<URL>();

  useEffect(() => {
    (async () => {
      if (!initTx || initTx == "loading") return;

      const res = await arGql("https://arweave.net/graphql").getTransactions({
        owners: [tags.Scheduler],
        tags: [
          { name: "Data-Protocol", values: ["ao"] },
          { name: "Type", values: ["Scheduler-Location"] },
        ]
      });

      const url = res?.transactions?.edges?.[0]?.node?.tags?.find((t) => t.name === "Url")?.value;
      if (!url) return;

      setSchedulerURL(new URL(url));
    })();
  }, [tags, initTx]);

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing">("incoming");
  const [incoming, setIncoming] = useState([]);
  const [hasMoreInteractions, setHasMoreInteractions] = useState(true);
  const [outgoing, setOutgoing] = useState<OutgoingInteraction[]>([]);

  useEffect(() => {
    (async () => {
      const scheduler = schedulerURL?.toString() || "https://ao-su-1.onrender.com/";
      const incomingRes = await (await fetch(`${scheduler}${id}`)).json();

      setIncoming(incomingRes.edges);
    })();
  }, [schedulerURL, id]);

  async function fetchOutgoing() {
    const res = await arGql("https://arweave.net/graphql").getTransactions({
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "From-Process", values: [id] }
      ],
      first: 100,
      after: outgoing[outgoing.length - 1]?.cursor
    });

    setHasMoreInteractions(res.transactions.pageInfo.hasNextPage);
    setOutgoing((val) => [
      ...val,
      ...res.transactions.edges.map((tx) => ({
        id: tx.node.id,
        action: tx.node.tags.find((tag) => tag.name === "Action")?.value || "-",
        block: tx.node.block?.height || 0,
        time: (tx.node.block?.timestamp || 0) * 1000,
        cursor: tx.cursor
      }))
    ]);
  }

  useEffect(() => {
    fetchOutgoing();
  }, [id]);

  if (!initTx || initTx == "loading") {
    return (
      <Wrapper>
        <NotFound>
          {(!initTx && "Could not find process") || "Loading..."}
        </NotFound>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ProcessTitle>
        Process
        {tags.Name && (
          <ProcessName>
            {tags.Name}
          </ProcessName>
        )}
      </ProcessTitle>
      <ProcessID>
        {id}
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Owner</td>
            <td>{formatAddress(initTx.node.owner.address)}</td>
          </tr>
          <tr>
            <td>Variant</td>
            <td>{tags.Variant}</td>
          </tr>
          <tr>
            <td>Module</td>
            <td>{formatAddress(tags["Module"])}</td>
          </tr>
          <tr>
            <td>Scheduler</td>
            <td>
              {schedulerURL?.host || ""}
              {" "}
              ({formatAddress(tags.Scheduler, 7)})
            </td>
          </tr>
        </Table>
      </Tables>
      <Title>
        Interactions
      </Title>
      <InteractionsMenu>
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
      </InteractionsMenu>
      {interactionsMode === "incoming" && (
        <Table>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Action</th>
            <th>From</th>
            <th>Block</th>
            <th>Time</th>
          </tr>
          {incoming.map((interaction: any, i) => (
            <tr key={i}>
              <td></td>
              <td>
                {formatAddress(interaction.node.message.id)}
              </td>
              <td>
                {interaction.node.message.tags.find((t: any) => t.name === "Action")?.value || "-"}
              </td>
              <td>
                {formatAddress(interaction.node.owner.address, 8)}
              </td>
              <td>
                {parseInt(interaction.node.block)}
              </td>
              <td>
                {dayjs(interaction.node.timestamp).fromNow()}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {interactionsMode === "outgoing" && (
        <InfiniteScroll
          dataLength={outgoing.length}
          next={fetchOutgoing}
          hasMore={hasMoreInteractions}
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
              <th>Block</th>
              <th>Time</th>
            </tr>
            {outgoing.map((interaction, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  {formatAddress(interaction.id)}
                </td>
                <td>
                  {interaction.action}
                </td>
                <td>
                  {interaction.block}
                </td>
                <td>
                  {dayjs(interaction.time).fromNow()}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.section`
  padding: 2rem 10vw;
`;

const ProcessTitle = styled.h1`
  display: flex;
  align-items: baseline;
  gap: .35rem;
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0 0 .5rem;
  color: #fff;
`;

const Title = styled.h2`
  font-size: 1.35rem;
  font-weight: 600;
  color: #fff;
  margin: 1em 0 .4em;
`;

const NotFound = styled.p`
  text-align: center;
  color: #fff;
  margin: 2rem;
`;

const ProcessName = styled.span`
  font-size: 1em;
  color: rgba(255, 255, 255, .7);
`;

const ProcessID = styled.h2`
  font-size: 1rem;
  color: rgba(255, 255, 255, .85);
  font-weight: 400;
  margin: 0 0 2.7rem;
`;

const Tables = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
`;

const InteractionsMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  margin-bottom: 1rem;
`;

const InteractionsMenuItem = styled.p<{ active?: boolean; }>`
  font-size: .94rem;
  color: ${props => props.active ? "#04ff00" : "rgba(255, 255, 255, .7)"};
  padding: .75rem .85rem;
  margin: 0;
  cursor: pointer;
  font-weight: 400;
  border-bottom: 2px solid ${props => props.active ? "#04ff00" : "transparent"};
  transition: all .15s ease-in-out;
`;

interface Props {
  id: string;
}

interface OutgoingInteraction {
  id: string;
  action: string;
  block: number;
  time: number;
  cursor: string;
}
