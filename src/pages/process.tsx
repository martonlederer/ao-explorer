import { ArrowRightIcon, ClipboardIcon, DownloadIcon, ShareIcon } from "@iconicicons/react";
import { createDataItemSigner, message } from "@permaweb/aoconnect"
import InfiniteScroll from "react-infinite-scroll-component";
import { useConnection } from "@arweave-wallet-kit/react";
import arGql, { TransactionEdge } from "arweave-graphql";
import { useEffect, useMemo, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import { formatAddress } from "../utils/format";
import { Link, useLocation } from "wouter";
import { styled } from "@linaria/react";
import { LoadingStatus } from "./index";
import Table from "../components/Table";
import Button from "../components/Btn";
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
      })).filter((interaction) => !val.find(v => v.id === interaction.id))
    ]);
  }

  useEffect(() => {
    fetchOutgoing();
  }, [id]);

  const [query, setQuery] = useState('{\n\t"tags": [\n\t\t{ "name": "Action", "value": "Balance" }\n\t],\n\t"data": ""\n}');
  const { connect, connected } = useConnection();
  const [, setLocation] = useLocation();

  async function queryProcess() {
    if (!connected) await connect();
    const messageQuery = JSON.parse(query);
    const messageID = await message({
      process: id,
      // TODO: use wallet kit
      // @ts-expect-error
      signer: createDataItemSigner(window.arweaveWallet),
      tags: messageQuery.tags || [],
      data: messageQuery.data
    });
    setLocation(`#/${id}/${messageID}`);
  }

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
        <Copy
          onClick={() => navigator.clipboard.writeText(id)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Owner</td>
            <td>
              <Link to={`#/user/${initTx.node.owner.address}`}>
                {formatAddress(initTx.node.owner.address)}
                <ShareIcon />
              </Link>
            </td>
          </tr>
          <tr>
            <td>Variant</td>
            <td>{tags.Variant}</td>
          </tr>
          <tr>
            <td>Module</td>
            <td>
              <a href={`https://viewblock.io/arweave/tx/${tags.Module}`} target="_blank" rel="noopener noreferer">
                {formatAddress(tags["Module"])}
                <ShareIcon />
              </a>
            </td>
          </tr>
          <tr>
            <td>Scheduler</td>
            <td>
              {schedulerURL?.host || ""}
              {" ("}
              <a href={`https://viewblock.io/arweave/tx/${tags.Scheduler}`} target="_blank" rel="noopener noreferer">
                {formatAddress(tags.Scheduler, schedulerURL?.host ? 6 : 13)}
                <ShareIcon />
              </a>
              {")"}
            </td>
          </tr>
          <tr>
            <td>SDK</td>
            <td>
              {tags.SDK}
            </td>
          </tr>
          <tr>
            <td>Memory</td>
            <td>
              <a href={`https://ao-cu-1.onrender.com/state/${id}`}>
                Download
                <DownloadIcon />
              </a>
            </td>
          </tr>
        </Table>
        <Query>
          <QueryInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              e.preventDefault();

              // @ts-expect-error
              const selStart = e.target.selectionStart;
              const textWithTab = 
                query.substring(0, selStart) +
                "  " +
                // @ts-expect-error
                query.substring(e.target.selectionEnd, query.length);

              // @ts-expect-error
              e.target.value = textWithTab;
              // @ts-expect-error
              e.target.setSelectionRange(selStart + 2, selStart + 2);
              setQuery(textWithTab);
            }}
          ></QueryInput>
          <Button onClick={queryProcess}>
            Query
            <ArrowRightIcon />
          </Button>
        </Query>
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
          {incoming.sort((a: any, b: any) => parseInt(b.node.timestamp) - parseInt(a.node.timestamp)).map((interaction: any, i) => (
            <tr key={i}>
              <td></td>
              <td>
                <Link to={`#/${id}/${interaction.node.message.id}`}>
                  {formatAddress(interaction.node.message.id)}
                </Link>
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
                  <Link to={`#/${id}/${interaction.id}`}>
                    {formatAddress(interaction.id)}
                  </Link>
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
  margin: 1em 0 .5em;
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
  display: flex;
  align-items: center;
  gap: .28rem;
  font-size: 1rem;
  color: rgba(255, 255, 255, .85);
  font-weight: 400;
  margin: 0 0 2.7rem;
`;

const Copy = styled(ClipboardIcon)`
  width: 1.25rem;
  height: 1.25rem;
  color: inherit;
  cursor: pointer;
  transition: all .17s ease-in-out;

  &:hover {
    opacity: .8;
  }

  &:active {
    transform: scale(.9);
  }
`;

const Tables = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  a {
    display: inline-flex;
    color: #04ff00;
  }
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

const Query = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 1rem;

  button {
    margin-left: auto;
  }
`;

const QueryInput = styled.textarea`
  display: inline-block;
  background-color: rgba(255, 255, 255, .05);
  padding: .7rem;
  font-family: "Space Mono", monospace;
  font-size: 1rem;
  color: #fff;
  border: none;
  outline: none;
  resize: none;
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
