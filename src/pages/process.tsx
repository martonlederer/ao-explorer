import { Copy, NotFound, ProcessID, ProcessName, ProcessTitle, Title, Wrapper } from "../components/Page";
import { DownloadIcon, ShareIcon } from "@iconicicons/react";
import { createDataItemSigner, message, dryrun } from "@permaweb/aoconnect"
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
import dayjs from "dayjs";
import { Message } from "./interaction";
import { Quantity } from "ao-tokens-lite";

dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

interface Process {
  id: string;
  name: string;
  module: string;
  block: number;
  timestamp: number;
  cursor: string;
}

const wellKnownTokens = {
  "7zH9dlMNoxprab9loshv3Y7WG45DOny_Vrq9KrXObdQ": {
    name: "Ethereum Wrapped USDC",
    ticker: "wUSDC",
    denomination: 6n,
    logo: "VL4_2p40RKvFOQynAMilDQ4lcwjtlK3Ll-xtRhv9GSY"
  },
  "7j3jUyFpTuepg_uu_sJnwLE6KiTVuA9cLrkfOp2MFlo": {
    name: "BSC Wrapped USDT",
    ticker: "wUSDT",
    denomination: 18n,
    logo: "9vHNDNa6gHxhwndjL_SZcKvXzljarHRQxhHb3sgCeME"
  },
  "0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc": {
    name: "AO",
    ticker: "AO",
    denomination: 12n,
    logo: "UkS-mdoiG8hcAClhKK8ch4ZhEzla0mCPDOix9hpdSFE"
  },
  "xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10": {
    name: "Wrapped AR",
    ticker: "wAR",
    denomination: 12n,
    logo: "L99jaxRKQKJt9CqoJtPaieGPEhJD3wNhR4iGqc8amXs"
  },
  "cBgS-V_yGhOe9P1wCIuNSgDA_JS8l4sE5iFcPTr0TD0": {
    name: "Wrapped ETH",
    ticker: "wETH",
    denomination: 18n,
    logo: "RJ0om4TNkNM4nUsWC5KG3VkLf8HWfhsVm3tJBMke1Ws"
  },
  "7GoQfmSOct_aUOWKM4xbKGg6DzAmOgdKwg8Kf-CbHm4": {
    name: "Wander",
    ticker: "WNDR",
    denomination: 18n,
    logo: "xUO2tQglSYsW89aLYN8ErGivZqezoDaEn95JniaCBZk"
  },
  "n2MhPK0O3yEvY2zW73sqcmWqDktJxAifJDrri4qireI": {
    name: "LiquidOps",
    ticker: "LQD",
    denomination: 18n,
    logo: "iI9VnQdPXlVl967iAdCY4zJYVBfk5jpr_qab-Hzm4qI"
  }
};

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

  const owner = useMemo(() => {
    if (initTx === "loading") return undefined;
    const ownerAddr = tags["From-Process"] || initTx.node.owner.address;

    return {
      addr: ownerAddr,
      type: typeof tags["From-Process"] !== "undefined" ? "process" : "user"
    }
  }, [tags, initTx]);

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

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing" | "spawns" | "evals" | "transfers" | "balances" | "holders">("incoming");

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

  useEffect(() => {
    setIncoming([]);
    setHasMoreIncoming(true);
  }, [id]);

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
    setOutgoing([]);
    setHasMoreOutgoing(true);
    fetchOutgoing();
  }, [id, gateway]);

  const [hasMoreSpawns, setHasMoreSpawns] = useState(true);
  const [spawns, setSpawns] = useState<Process[]>([]);

  async function fetchSpawns() {
    const res = await arGql(`${gateway}/graphql`).getTransactions({
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "Type", values: ["Process"] },
        { name: "From-Process", values: [id] }
      ],
      first: 100,
      after: spawns[spawns.length - 1]?.cursor
    });

    setHasMoreSpawns(res.transactions.pageInfo.hasNextPage);
    setSpawns((val) => {
      for (const tx of res.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
        val.push({
          id: tx.node.id,
          name: getTagValue("Name", tx.node.tags) || "",
          module: getTagValue("Module", tx.node.tags) || "",
          block: tx.node.block?.height || 0,
          timestamp: (tx.node.block?.timestamp || 0) * 1000,
          cursor: tx.cursor
        });
      }

      return val;
    });
  }

  useEffect(() => {
    setSpawns([]);
    setHasMoreSpawns(true);
    fetchSpawns();
  }, [id, gateway]);

  const [cachedTokens, setCachedTokens] = useState<Record<string, { name: string; ticker: string; denomination: bigint; logo: string; } | "pending">>(wellKnownTokens);
  const [transfers, setTransfers] = useState<{ id: string; dir: "in" | "out"; from: string; to: string; quantity: string; token: string; time?: number; cursor: string; }[]>([]);
  const [hasMoreTransfers, setHasMoreTransfers] = useState(true);

  async function fetchTransfers() {
    const res = await arGql(`${gateway}/graphql`).getTransactions({
      recipients: [id],
      tags: [
        { name: "Data-Protocol", values: ["ao"] },
        { name: "Type", values: ["Message"] },
        { name: "Action", values: ["Credit-Notice", "Debit-Notice"] }
      ],
      first: 100,
      after: transfers[transfers.length - 1]?.cursor
    });

    setHasMoreTransfers(res.transactions.pageInfo.hasNextPage);
    setTransfers((val) => {
      for (const tx of res.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
        const dir = getTagValue("Action", tx.node.tags) === "Credit-Notice" ? "in" : "out";
        const token = getTagValue("Forwarded-For", tx.node.tags) || getTagValue("From-Process", tx.node.tags) || tx.node.owner.address;

        cacheToken(token);
        val.push({
          id: tx.node.id,
          dir,
          from: dir === "in" ? getTagValue("Sender", tx.node.tags) || "" : id,
          to: dir === "out" ? getTagValue("Recipient", tx.node.tags) || "" : id,
          quantity: getTagValue("Quantity", tx.node.tags) || "0",
          token,
          time: tx.node.block?.timestamp,
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
  }, [id, gateway]);

  const [info, setInfo] = useState<Record<string, string> | undefined>();
  const [viewMoreInfo, setViewMoreInfo] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await dryrun({
        process: id,
        tags: [{ name: "Action", value: "Info" }]
      });

      if (!res?.Messages || res.Messages.length === 0) {
        return setInfo(undefined);
      }

      const infoRes: Message = res.Messages.find((msg: Message) => !!msg.Tags.find((t) => t.name === "Name")?.value) || res.Messages[0];
      const newInfo: Record<string, string> = {};

      if (infoRes.Data && infoRes.Data !== "") {
        try {
          newInfo.Data = JSON.stringify(JSON.parse(infoRes.Data), null, 2);
        } catch {
          newInfo.Data = infoRes.Data;
        }
      }
      for (const tag of infoRes.Tags) {
        newInfo[tag.name] = tag.value;
      }

      setInfo(newInfo);
    })();
  }, [id]);

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
              Owner: id,
              tags: [
                { name: "Action", value: "Balance" },
                { name: "Recipient", value: id }
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
          val.push({
            token: balRes.token,
            balance: BigInt(getTagValue("Balance", balanceMsg.Tags) || 0)
          });
        }

        return val;
      });
    } catch {}
    setLoadingTokenBalances(false);
  }

  useEffect(() => {
    console.log(tokenBalances)
    setTokenBalances([]);
    fetchTokenBalances();
  }, [id]);
  useEffect(() => {
    fetchTokenBalances();
  }, [cachedTokens]);

  const [holders, setHolders] = useState<{ addr: string; balance: bigint; }[]>([]);

  useEffect(() => {
    (async () => {
      const res = await dryrun({
        process: id,
        tags: [
          { name: "Action", value: "Balances" }
        ]
      });
      if (!res.Messages[0]?.Data || res.Messages[0].Data === "") {
        return setHolders([]);
      }

      try {
        const balances: { addr: string; balance: bigint; }[] = [];

        for (const [holder, bal] of Object.entries(JSON.parse(res.Messages[0].Data))) {
          balances.push({
            addr: holder,
            balance: BigInt(bal as string || 0)
          });
        }

        setHolders(balances);
      } catch {
        // not balances obj
        setHolders([]);
      }
    })();
  }, [id]);

  // @ts-expect-error
  const [query, setQuery] = useState('{\n\t"tags": [\n\t\t{ "name": "Action", "value": "Balance" }\n\t],\n\t"data": ""\n}');
  const { connect, connected } = useConnection();
  const [, setLocation] = useLocation();
  const [loadingQuery, setLoadingQuery] = useState(false);

  // @ts-expect-error
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

  function formatQuantity(qty: Quantity) {
    if (Quantity.eq(qty, new Quantity(0, 0n))) {
      return "0";
    }
    let maximumFractionDigits = 2;
    if (Quantity.lt(qty, new Quantity(0, qty.denomination).fromString("0.01"))) {
      maximumFractionDigits = Number(qty.denomination)
    }
    if (qty.denomination > 8 && Quantity.lt(qty, new Quantity(0, qty.denomination).fromString("0." + "0".repeat(7) + "1"))) {
      return ">0." + "0".repeat(7) + "1";
    }

    // @ts-expect-error
    return qty.toLocaleString(undefined, { maximumFractionDigits });
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
        {!!(info?.Name || tags.Name) && (
          <ProcessName>
            {info?.Name || tags.Name}
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
              {owner && (
                (owner.type === "user" && (
                  <a
                    href={`https://viewblock.io/arweave/address/${owner.addr}`}
                    target="_blank"
                    rel="noopener noreferer"
                  >
                    {formatAddress(owner.addr)}
                    <ShareIcon />
                  </a>
                )) || (
                  <Link to={`#/process/${owner.addr}`}>
                    {formatAddress(owner.addr)}
                    <ShareIcon />
                  </Link>
                )
              )}
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
          {info && (
            <tr>
              <td>Info</td>
              <td>
                <Table>
                  {Object.keys(info).slice(0, viewMoreInfo ? Object.keys(info).length : 4).map((name, i) => (
                    <tr key={i}>
                      <td>{name}</td>
                      <td style={name === "Data" ? { whiteSpace: "pre-wrap" } : {}}>{info[name]}</td>
                    </tr>
                  ))}
                  {Object.keys(info).length > 4 && (
                    <tr>
                      <td></td>
                      <td>
                        <a onClick={() => setViewMoreInfo(v => !v)}>
                          View{" "}
                          {viewMoreInfo ? "less" : "more"}
                        </a>
                      </td>
                    </tr>
                  )}
                </Table>
              </td>
            </tr>
          )}
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
        <InteractionsMenuItem
          active={interactionsMode === "spawns"}
          onClick={() => setInteractionsMode("spawns")}
        >
          Spawns
        </InteractionsMenuItem>
        <InteractionsMenuItem
          active={interactionsMode === "evals"}
          onClick={() => setInteractionsMode("evals")}
        >
          Evals
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
        {holders.length > 0 && (
          <InteractionsMenuItem
            active={interactionsMode === "holders"}
            onClick={() => setInteractionsMode("holders")}
          >
            Holders
          </InteractionsMenuItem>
        )}
      </InteractionsMenu>
      {interactionsMode === "holders" && (
        <Table>
          <tr>
            <th></th>
            <th>Holder address</th>
            <th>Balance</th>
          </tr>
          {holders.map((item, i) => item.balance > 0n && (
            <tr key={i}>
              <td></td>
              <td>
                <Link to={`#/process/${item.addr}`}>
                  {formatAddress(item.addr)}
                </Link>
              </td>
              <td style={{ display: "flex", alignItems: "center" }}>
                <span>
                  {formatQuantity(new Quantity(item.balance, BigInt(info?.Denomination || 12)))}
                </span>
                {info?.Ticker && (
                  <TokenTicker>
                    {info.Logo && <TokenIcon src={`${gateway}/${info.Logo}`} draggable={false} />}
                    {info.Ticker}
                  </TokenTicker>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {interactionsMode === "balances" && (
        <>
          <Table>
            <tr>
              <th></th>
              <th>Token name</th>
              <th>Balance</th>
            </tr>
            {tokenBalances.map((balance, i) => balance.balance > 0n && (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/process/${balance.token}`}>
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
        </>
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
                  <Link to={`#/message/${transfer.id}`}>
                    {formatAddress(transfer.id)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/process/${transfer.from}`}>
                    {formatAddress(transfer.from, 8)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/process/${transfer.to}`}>
                    {formatAddress(transfer.to, 8)}
                  </Link>
                </td>
                <td>
                  <Link to={`#/process/${transfer.to}`}>
                    <span style={{ color: transfer.dir === "out" ? "#ff0000" : "#00db5f" }}>
                      {transfer.dir === "out" ? "-" : "+"}
                      {//@ts-expect-error
                        formatQuantity(new Quantity(transfer.quantity, cachedTokens[transfer.token] !== "pending" ? cachedTokens[transfer.token]?.denomination || 12 : 12))}
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
      {(interactionsMode === "incoming" || interactionsMode === "evals") && (
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
            {incoming && incoming.map((interaction: any, i) => (interactionsMode !== "evals" || getTagValue("Action", interaction.node.message.tags) === "Eval") && (
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
      {interactionsMode === "spawns" && (
        <InfiniteScroll
          dataLength={spawns.length}
          next={fetchSpawns}
          hasMore={hasMoreSpawns}
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
              <th>Name</th>
              <th>Module</th>
              <th>Block</th>
              <th>Time</th>
            </tr>
            {spawns.map((process, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/process/${process.id}`}>
                    {formatAddress(process.id)}
                  </Link>
                </td>
                <td>
                  {process.name}
                </td>
                <td>
                  <a href={`https://viewblock.io/arweave/tx/${process.module}`} target="_blank" rel="noopener noreferrer">
                    {formatAddress(process.module, 8)}
                  </a>
                </td>
                <td>
                  {process.block}
                </td>
                <td>
                  {formatTimestamp(process.timestamp)}
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

export const InteractionsMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  margin-bottom: 1rem;
`;

export const InteractionsMenuItem = styled.p<{ active?: boolean; }>`
  font-size: .94rem;
  color: ${props => props.active ? "#04ff00" : "rgba(255, 255, 255, .7)"};
  padding: .75rem .85rem;
  margin: 0;
  cursor: pointer;
  font-weight: 400;
  border-bottom: 2px solid ${props => props.active ? "#04ff00" : "transparent"};
  transition: all .15s ease-in-out;
`;

// @ts-expect-error
const Query = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 1rem;

  button {
    margin-left: auto;
  }
`;

// @ts-expect-error
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

const Tables = styled.div`
  width: 100%;

  ${Table} {
    width: 100%;
  }

  a {
    display: inline-flex !important;
    color: #04ff00 !important;
  }

  ${Table} tr td:first-child {
    white-space: nowrap;
  }
`;

const TokenTicker = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: .2rem;
`;

const TokenIcon = styled.img`
  width: 1.1em;
  height: 1.1em;
  border-radius: 100%;
  object-fit: cover;
  user-select: none;
`;
