import { Copy, NotFound, ProcessID, ProcessName, ProcessTitle, Tables, Title, Wrapper } from "../components/Page";
import { ArrowRightIcon, DownloadIcon, ShareIcon } from "@iconicicons/react";
import { createDataItemSigner, message } from "@permaweb/aoconnect"
import InfiniteScroll from "react-infinite-scroll-component";
import arGql, { Tag, TransactionEdge } from "arweave-graphql";
import { formatAddress, getTagValue } from "../utils/format";
import { useConnection } from "@arweave-wallet-kit/react";
import advancedFormat from "dayjs/plugin/advancedFormat";
import TagEl, { TagsWrapper } from "../components/Tag";
import { useEffect, useMemo, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import isYesterday from "dayjs/plugin/isYesterday";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { useGateway } from "../utils/hooks";
import isToday from "dayjs/plugin/isToday";
import { Link, useLocation } from "wouter";
import { styled } from "@linaria/react";
import { LoadingStatus } from "./index";
import Table from "../components/Table";
import Button from "../components/Btn";
import dayjs from "dayjs";

dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

export default function Process({ id }: Props) {
  const [initTx, setInitTx] = useState<TransactionEdge | "loading">("loading");
  const gateway = useGateway();

  useEffect(() => {
    (async () => {
      setInitTx("loading");
      const res = await arGql(`${gateway}/graphql`).getTransactions({
        ids: [id]
      });

      setInitTx(res.transactions.edges[0] as TransactionEdge);
    })();
  }, [id, gateway]);

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

      const res = await arGql(`${gateway}/graphql`).getTransactions({
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
  }, [tags, initTx, gateway]);

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing">("incoming");

  const [hasMoreIncoming, setHasMoreIncoming] = useState(true);
  const [incoming, setIncoming] = useState<{ cursor: string; node: Record<string, any> }[]>([]);

  const getNonce = (node: Record<string, any>) =>
    parseInt(node.assignment.tags.find((tag: Tag) => tag.name === "Nonce")?.value) || undefined;

  async function fetchIncoming() {
    const scheduler = schedulerURL?.toString() || "https://su-router.ao-testnet.xyz/";
    let toNonce = parseInt(incoming[incoming?.length - 1]?.cursor) - 1;
    let fromNonce = toNonce - 100;

    if (incoming.length === 0 && hasMoreIncoming) {
      const res = await (await fetch(`${scheduler}${id}/latest`)).json();
      toNonce = getNonce(res) || 0;
      fromNonce = toNonce - 100;
    }

    const res = await (await fetch(`${scheduler}${id}?from-nonce=${fromNonce}&to-nonce=${toNonce}&limit=100`)).json();

    setHasMoreIncoming(res.edges.length > 0 && (getNonce(res.edges[0].node) || 0) > 0);
    setIncoming((val) => val.concat(res.edges.reverse()));
  }

  const [hasMoreOutgoing, setHasMoreOutgoing] = useState(true);
  const [outgoing, setOutgoing] = useState<OutgoingInteraction[]>([]);

  async function fetchOutgoing() {
    const res = await arGql(`${gateway}/graphql`).getTransactions({
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "From-Process", values: [id] }
      ],
      first: 100,
      after: outgoing[outgoing.length - 1]?.cursor
    });

    setHasMoreOutgoing(res.transactions.pageInfo.hasNextPage);
    setOutgoing((val) => {
      // manually filter out duplicate transactions
      // for some reason, the ar.io nodes return the
      // same transaction multiple times for certain
      // queries
      for (const tx of res.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
        val.push({
          id: tx.node.id,
          target: tx.node.recipient,
          action: tx.node.tags.find((tag) => tag.name === "Action")?.value || "-",
          block: tx.node.block?.height || 0,
          time: tx.node.block?.timestamp,
          cursor: tx.cursor
        });
      }

      return val;
    });
  }

  useEffect(() => {
    fetchOutgoing();
  }, [id, gateway]);

  const [query, setQuery] = useState('{\n\t"tags": [\n\t\t{ "name": "Action", "value": "Balance" }\n\t],\n\t"data": ""\n}');
  const { connect, connected } = useConnection();
  const [, setLocation] = useLocation();
  const [loadingQuery, setLoadingQuery] = useState(false);

  async function queryProcess() {
    if (loadingQuery) return;
    setLoadingQuery(true);
    try {
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
      setLocation(`#/message/${messageID}`);
    } catch (e) {
      console.log("Query error:", e);
    }
    setLoadingQuery(false);
  }

  const formatTimestamp = (t?: number) => {
    if (!t) return "Pending...";
    if (!dayjs(t).isToday()) { // not today
      if (dayjs(t).isYesterday()) {
        return "Yesterday";
      }
      if (dayjs(t).year() === dayjs().year()) { // same year
        if (dayjs(t).week() === dayjs().week()) {
          return dayjs(t).format("dddd");
        }

        return dayjs(t).format("MMMM Do");
      }

      return dayjs(t).format("DD MMMM, YYYY");
    }

    return dayjs(t).fromNow();
  };

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
              <a href={`https://viewblock.io/arweave/address/${initTx.node.owner.address}`} target="_blank" rel="noopener noreferer">
                {formatAddress(initTx.node.owner.address)}
                <ShareIcon />
              </a>
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
              <a href={`https://viewblock.io/arweave/address/${tags.Scheduler}`} target="_blank" rel="noopener noreferer">
                {formatAddress(tags.Scheduler, schedulerURL?.host ? 6 : 13)}
                <ShareIcon />
              </a>
              {")"}
            </td>
          </tr>
          <tr>
            <td>Tags</td>
            <td>
              <TagsWrapper>
                {Object.keys(tags).map((name, i) => (
                  <TagEl
                    name={name}
                    value={tags[name]}
                    key={i}
                  />
                ))}
              </TagsWrapper>
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
            {(loadingQuery && "Loading...") || (
              <>
                Query
                <ArrowRightIcon />
              </>
            )}
          </Button>
        </Query>
      </Tables>
      <Title>
        Messages
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
            {incoming && incoming.map((interaction: any, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/message/${interaction.node.message.id}`}>
                    {formatAddress(interaction.node.message.id)}
                  </Link>
                </td>
                <td>
                  {interaction.node.message.tags.find((t: Tag) => t.name === "Action")?.value || "-"}
                </td>
                <td>
                  {(() => {
                    const fromProcess = interaction.node.message.tags.find((t: Tag) => t.name === "From-Process")?.value

                    if (fromProcess) {
                      return (
                        <Link to={`#/process/${fromProcess}`}>
                          {formatAddress(fromProcess)}
                        </Link>
                      )
                    }

                    return (
                      <a href={`https://viewblock.io/arweave/address/${interaction.node.message.owner.address}`} target="_blank" rel="noopener noreferrer">
                        {formatAddress(interaction.node.message.owner.address, 8)}
                      </a>
                    )
                  })()}
                </td>
                <td>
                  {parseInt(getTagValue("Block-Height", interaction.node.assignment.tags) || "0")}
                </td>
                <td>
                  {(() => {
                    const t = parseInt(getTagValue("Timestamp", interaction.node.assignment.tags) || "0");

                    return formatTimestamp(t);
                  })()}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
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
            {outgoing.map((interaction, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/message/${interaction.id}`}>
                    {formatAddress(interaction.id)}
                  </Link>
                </td>
                <td>
                  {interaction.action}
                </td>
                <td>
                  <Link to={`#/process/${interaction.target}`}>
                    {formatAddress(interaction.target)}
                  </Link>
                </td>
                <td>
                  {interaction.block}
                </td>
                <td>
                  {formatTimestamp(interaction.time && interaction.time * 1000)}
                </td>
              </tr>
            ))}
          </Table>
        </InfiniteScroll>
      )}
    </Wrapper>
  );
}

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
  target: string;
  action: string;
  block: number;
  time?: number;
  cursor: string;
}
