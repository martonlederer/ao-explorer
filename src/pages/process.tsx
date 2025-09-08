import { Copy, NotFound, ProcessID, ProcessName, ProcessTitle, Title, TokenLogo, Wrapper, Tables } from "../components/Page";
import { DownloadIcon, ShareIcon } from "@iconicicons/react";
import { createDataItemSigner, message, dryrun, result } from "@permaweb/aoconnect"
import InfiniteScroll from "react-infinite-scroll-component";
import { formatAddress, getTagValue } from "../utils/format";
import { useActiveAddress, useConnection } from "@arweave-wallet-kit/react";
import advancedFormat from "dayjs/plugin/advancedFormat";
import TagEl, { TagsWrapper } from "../components/Tag";
import { useContext, useEffect, useMemo, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import isYesterday from "dayjs/plugin/isYesterday";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { BookmarkIcon } from "@iconicicons/react";
import { useGateway } from "../utils/hooks";
import isToday from "dayjs/plugin/isToday";
import { Link } from "wouter";
import { styled } from "@linaria/react";
import { LoadingStatus } from "./index";
import Table from "../components/Table";
import dayjs from "dayjs";
import { Message } from "./interaction";
import { Quantity } from "ao-tokens-lite";
import { Editor, OnMount } from "@monaco-editor/react";
import Button from "../components/Btn";
import { MarkedContext } from "../components/MarkedProvider";
import { GetOutgoingMessages, GetTransfersFor, TransactionNode } from "../queries/messages";
import { GetSchedulerLocation, GetSpawnMessage, GetSpawnedBy, Tag } from "../queries/processes";
import { useApolloClient } from "@apollo/client";
import EntityLink from "../components/EntityLink";

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

export const formatTimestamp = (t?: number) => {
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

export default function Process({ initTx }: Props) {
  const id = useMemo(() => initTx.id, [initTx]);
  const gateway = useGateway();
  const client = useApolloClient();

  // useEffect(() => {
  //   (async () => {
  //     setInitTx("loading");
  //     const res = await client.query({
  //       query: GetSpawnMessage,
  //       variables: { id }
  //     });

  //     setInitTx(res.data.transactions.edges[0]?.node as TransactionNode);
  //   })();
  // }, [id, gateway, client]);

  const tags = useMemo(() => Object.fromEntries(initTx.tags.map(t => [t.name, t.value])), [initTx]);

  const owner = useMemo(() => {
    const ownerAddr = tags["From-Process"] || initTx.owner.address;

    return {
      addr: ownerAddr,
      type: typeof tags["From-Process"] !== "undefined" ? "process" : "user"
    }
  }, [tags, initTx]);

  const [schedulerURL, setSchedulerURL] = useState<URL>();

  useEffect(() => {
    (async () => {
      const res = await client.query({
        query: GetSchedulerLocation,
        variables: { id: tags.Scheduler }
      });

      const url = res?.data?.transactions?.edges?.[0]?.node?.tags?.find((t) => t.name === "Url")?.value;
      if (!url) return;

      setSchedulerURL(new URL(url));
    })();
  }, [tags, initTx, gateway]);

  const [interactionsMode, setInteractionsMode] = useState<"incoming" | "outgoing" | "spawns" | "evals" | "transfers" | "balances" | "holders" | "query" | "info">("incoming");

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
    const res = await client.query({
      query: GetOutgoingMessages,
      variables: {
        process: id,
        cursor: outgoing[outgoing.length - 1]?.cursor
      }
    });

    setHasMoreOutgoing(res.data.transactions.pageInfo.hasNextPage);
    setOutgoing((val) => {
      // manually filter out duplicate transactions
      // for some reason, the ar.io nodes return the
      // same transaction multiple times for certain
      // queries
      for (const tx of res.data.transactions.edges) {
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
    const res = await client.query({
      query: GetSpawnedBy,
      variables: {
        process: id,
        cursor: spawns[spawns.length - 1]?.cursor
      }
    });

    setHasMoreSpawns(res.data.transactions.pageInfo.hasNextPage);
    setSpawns((val) => {
      for (const tx of res.data.transactions.edges) {
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
    const res = await client.query({
      query: GetTransfersFor,
      variables: {
        process: id,
        cursor: transfers[transfers.length - 1]?.cursor
      }
    });

    setHasMoreTransfers(res.data.transactions.pageInfo.hasNextPage);
    setTransfers((val) => {
      for (const tx of res.data.transactions.edges) {
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

  useEffect(() => {
    (async () => {
      setInfo(undefined);

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
          const balance = BigInt(getTagValue("Balance", balanceMsg.Tags) || 0);

          if (balance > 0n) {
            val.push({
              token: balRes.token,
              balance
            });
          }
        }

        return val;
      });
    } catch {}
    setLoadingTokenBalances(false);
  }

  useEffect(() => {
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

        setHolders(balances.sort((a, b) => a.balance > b.balance ? -1 : 1));
      } catch {
        // not balances obj
        setHolders([]);
      }
    })();
  }, [id]);

  const address = useActiveAddress();
  const messageSchema = useMemo(
    () => ({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        Owner: {
          anyOf: [
            { enum: [id, ...(address ? [address] : []), ...Object.keys(cachedTokens)] },
            {
              type: "string",
              pattern: "^[a-zA-Z0-9_-]{43}$",
              description: "Must be a valid Arweave address (43 characters: letters, digits, hyphen, underscore)."
            }
          ]
        },
        Id: {
          type: "string",
          pattern: "^[a-zA-Z0-9_-]{43}$",
          description: "Must be a valid Arweave address (43 characters: letters, digits, hyphen, underscore)."
        },
        Target: {
          anyOf: [
            { enum: [id, ...Object.keys(cachedTokens)] },
            {
              type: "string",
              pattern: "^[a-zA-Z0-9_-]{43}$",
              description: "Must be a valid Arweave address (43 characters: letters, digits, hyphen, underscore)."
            }
          ]
        },
        Tags: {
          anyOf: [
            {
              type: "object",
              properties: {
                Action: {
                  anyOf: [
                    { enum: ["Info", "Transfer", "Balance", "Balances", "Total-Supply", "Burn", "Eval"] },
                    { type: "string" }
                  ]
                },
                Recipient: {
                  anyOf: [
                    { enum: [id, ...(address ? [address] : []), ...Object.keys(cachedTokens)] },
                    { type: "string" }
                  ]
                },
                Quantity: { type: "string" },
                Sender: {
                  anyOf: [
                    { enum: [id, ...(address ? [address] : []), ...Object.keys(cachedTokens)] },
                    { type: "string" }
                  ]
                },
                Reference: { type: "string" }
              },
              additionalProperties: {
                type: "string"
              }
            },
            {
              type: "array",
              items: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      name: { const: "Action" },
                      value: {
                        anyOf: [
                          { enum: ["Info", "Transfer", "Balance", "Balances", "Total-Supply", "Burn", "Eval"] },
                          { type: "string" }
                        ]
                      }
                    },
                    required: ["name", "value"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      name: { const: "Recipient" },
                      value: {
                        anyOf: [
                          { enum: [id, ...(address ? [address] : []), ...Object.keys(cachedTokens)] },
                          { type: "string" }
                        ]
                      }
                    },
                    required: ["name", "value"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      name: { const: "Sender" },
                      value: {
                        anyOf: [
                          { enum: [id, ...(address ? [address] : []), ...Object.keys(cachedTokens)] },
                          { type: "string" }
                        ]
                      }
                    },
                    required: ["name", "value"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      name: { const: "Quantity" },
                      value: { type: "string" }
                    },
                    required: ["name", "value"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      name: { const: "Reference" },
                      value: { type: "string" }
                    },
                    required: ["name", "value"],
                    additionalProperties: false
                  },
                  {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      value: { type: "string" }
                    },
                    required: ["name", "value"],
                    additionalProperties: false
                  }
                ]
              }
            }
          ]
        },
        Data: {}
      },
      required: ["Target", "Tags"]
    }),
    [id, address, cachedTokens]
  );

  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string | undefined>();

  useEffect(() => {
    setQuery(JSON.stringify({
      Target: id,
      Tags: { Action: "Info" },
      Data: ""
    }, null, 2) + "\n");
    setQueryResult(undefined);
  }, [id]);

  const { connect, connected } = useConnection();

  function parseQuery(dryrun = false) {
    const messageQuery = JSON.parse(query);
    const dryRunObj: Record<string, string> = {};
    let tags: { name: string, value: string }[] = [];
    let messageData = messageQuery.Data;

    if (messageData && typeof messageData !== "string") {
      messageData = JSON.stringify(messageData);
    }
    if (dryrun) {
      dryRunObj.Owner = messageQuery.Owner || address || "0".repeat(43);
      dryRunObj.Id = messageQuery.Id || "0".repeat(43);
    }
    if (Array.isArray(messageData.Tags)) {
      tags = messageData.Tags;
    } else {
      tags = Object.entries(messageQuery.Tags || {}).map(([name, value]) => ({ name, value: String(value) }));
    }

    return {
      ...dryRunObj,
      process: messageQuery.Target,
      // TODO: use wallet kit
      // @ts-expect-error
      signer: createDataItemSigner(window.arweaveWallet),
      tags,
      data: messageData
    };
  }

  const [loadingMessage, setLoadingMessage] = useState(false);
  const [loadingDryRun, setLoadingDryRun] = useState(false);

  async function messageProcess() {
    if (loadingMessage || loadingDryRun) return;
    setLoadingMessage(true);
    try {
      if (!connected) await connect();
      const query = parseQuery();
      const messageID = await message(query);
      const messageResult = await result({
        process: query.process,
        message: messageID
      });

      setQueryResult(JSON.stringify(messageResult, null, 2));
    } catch (e) {
      console.log("Query error:", e);
    }
    setLoadingMessage(false);
  }

  async function dryRunProcess() {
    if (loadingMessage || loadingDryRun) return;
    setLoadingDryRun(true);
    try {
      const query = parseQuery(true);
      const dryRunResult = await dryrun(query);

      setQueryResult(JSON.stringify(dryRunResult, null, 2));
    } catch (e) {
      console.log("Query error:", e);
    }
    setLoadingDryRun(false);
  }

  const handleEditorMount: OnMount = (_, monacoInstance) => {
    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: "https://liquidops.io/schema.json",
          fileMatch: ["*"],
          schema: messageSchema
        }
      ]
    })
  };

  function formatQuantity(qty: Quantity, dir: "in" | "out" | "none" = "none") {
    const dirs = {
      in: "+",
      out: "-",
      none: ""
    };
    if (Quantity.eq(qty, new Quantity(0, 0n))) {
      return dirs[dir] + "0";
    }
    let maximumFractionDigits = 2;
    if (Quantity.lt(qty, new Quantity(0, qty.denomination).fromString("0.01"))) {
      maximumFractionDigits = Number(qty.denomination)
    }
    if (qty.denomination > 8 && Quantity.lt(qty, new Quantity(0, qty.denomination).fromString("0." + "0".repeat(7) + "1"))) {
      return "0." + "0".repeat(7) + "1 >";
    }

    // @ts-expect-error
    return dirs[dir] + qty.toLocaleString(undefined, { maximumFractionDigits });
  }

  const [markedProcesses, setMarkedProcesses] = useContext(MarkedContext);
  const isMarked = useMemo(
    () => markedProcesses.includes(id),
    [id, markedProcesses]
  );

  function toggleBookmark() {
    setMarkedProcesses((val) => {
      if (val.includes(id)) {
        return val.filter(p => p !== id);
      }

      return [...val, id];
    });
  }

  return (
    <Wrapper>
      <ProcessTitle>
        Process
        {// @ts-expect-error
          !!(info?.Name || tags.Name || (cachedTokens[id] !== "pending" && cachedTokens[id]?.name )) && (
          <ProcessName>
            {info?.Name || tags.Name || (cachedTokens[id] as any)?.name}
            {(info?.Logo || (cachedTokens[id] as any)?.logo) && <TokenLogo src={`${gateway}/${info?.Logo || (cachedTokens[id] as any)?.logo}`} draggable={false} />}
            <BookmarkProcess filled={isMarked} onClick={toggleBookmark} />
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
              {owner && <EntityLink address={owner?.addr} />}
            </td>
          </tr>
          <tr>
            <td>Variant</td>
            <td>{tags.Variant}</td>
          </tr>
          <tr>
            <td>Module</td>
            <td>
              <EntityLink address={tags.Module} />
            </td>
          </tr>
          <tr>
            <td>Scheduler</td>
            <td>
              {(schedulerURL?.host && (
                <>
                {schedulerURL.host}
                  {" ("}
                  <EntityLink address={tags.Scheduler} />
                  {")"}
                </>
              )) || (
                <EntityLink address={tags.Scheduler} />
              )}
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
      </Tables>
      <Title>
        Messages
      </Title>
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
        </InteractionsWrapper>
        <InteractionsWrapper>
          {info && (
            <InteractionsMenuItem
              active={interactionsMode === "info"}
              onClick={() => setInteractionsMode("info")}
            >
              Info
            </InteractionsMenuItem>
          )}
          <InteractionsMenuItem
            active={interactionsMode === "query"}
            onClick={() => setInteractionsMode("query")}
          >
            Query
          </InteractionsMenuItem>
        </InteractionsWrapper>
      </InteractionsMenu>
      {interactionsMode === "info" && info && (
        <QueryTab>
          <div>
            <TagsWrapper>
              {Object.keys(info).map((name, i) => name !== "Data" && info[name] !== "" && (
                <TagEl
                  name={name}
                  value={info[name]}
                  key={i}
                />
              ))}
            </TagsWrapper>
          </div>
          <Editor
            theme="vs-dark"
            defaultLanguage="json"
            defaultValue={"{}\n"}
            value={(info?.Data || "{}") + "\n"}
            options={{ minimap: { enabled: false }, readOnly: true }}
          />
        </QueryTab>
      )}
      {interactionsMode === "query" && (
        <div>
          <QueryTab>
            <Editor
              theme="vs-dark"
              defaultLanguage="json"
              defaultValue={query}
              onChange={(v) => setQuery(v || "")}
              onMount={handleEditorMount}
              options={{ minimap: { enabled: false } }}
            />
            <Editor
              theme="vs-dark"
              defaultLanguage="json"
              defaultValue={query}
              language={(typeof queryResult === "undefined" || loadingDryRun || loadingMessage) ? "txt" : "json"}
              value={(((loadingDryRun || loadingMessage) && "Loading...") || (queryResult || "Execute the message to see the result...")) + "\n"}
              options={{ minimap: { enabled: false }, readOnly: true }}
            />
          </QueryTab>
          <QueryBtns>
            <Button onClick={dryRunProcess}>
              {!loadingDryRun ? "Dry run" : "Loading..."}
            </Button>
            <Button onClick={messageProcess}>
              {!loadingMessage ? "Message" : "Loading..."}
            </Button>
          </QueryBtns>
        </div>
      )}
      {interactionsMode === "holders" && (
        <Table>
          <tr>
            <th></th>
            <th></th>
            <th>Holder address</th>
            <th>Balance</th>
          </tr>
          {holders.map((item, i) => item.balance > 0n && (
            <tr key={i}>
              <td></td>
              <td>{i + 1}.</td>
              <td>
                <EntityLink address={item.addr} />
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
            {tokenBalances.map((balance, i) => (
              <tr key={i}>
                <td></td>
                <td>
                  <Link to={`#/${balance.token}`}>
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
          {!loadingTokenBalances && tokenBalances.length === 0 && !hasMoreTransfers && (
            <LoadingStatus>
              No balances
            </LoadingStatus>
          )}
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
                  <Link to={`#/${transfer.id}`}>
                    {formatAddress(transfer.id)}
                  </Link>
                </td>
                <td>
                  <EntityLink address={transfer.from} />
                </td>
                <td>
                  <EntityLink address={transfer.from} />
                </td>
                <td>
                  <Link to={`#/${transfer.token}`}>
                    <span style={{ color: transfer.dir === "out" ? "#ff0000" : "#00db5f" }}>
                      {transfer.dir === "out" ? "-" : "+"}
                      {//@ts-expect-error
                        formatQuantity(new Quantity(transfer.quantity, cachedTokens[transfer.token] !== "pending" ? cachedTokens[transfer.token]?.denomination || 12n : 12n))}
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
                  <Link to={`#/${interaction.node.message.id}`}>
                    {formatAddress(interaction.node.message.id)}
                  </Link>
                </td>
                <td>
                  {interaction.node.message.tags.find((t: Tag) => t.name === "Action")?.value || "-"}
                </td>
                <td>
                  {(() => {
                    const fromProcess = interaction.node.message.tags.find((t: Tag) => t.name === "From-Process")?.value

                    return <EntityLink address={fromProcess || interaction.node.message.owner.address} />;
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
                  <Link to={`#/${process.id}`}>
                    {formatAddress(process.id)}
                  </Link>
                </td>
                <td>
                  {process.name}
                </td>
                <td>
                  <EntityLink address={process.module} />
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
                  <Link to={`#/${interaction.id}`}>
                    {formatAddress(interaction.id)}
                  </Link>
                </td>
                <td>
                  {interaction.action}
                </td>
                <td>
                  <EntityLink address={interaction.target} />
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
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  margin-bottom: 1rem;
`;

export const InteractionsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
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
  initTx: TransactionNode;
}

interface OutgoingInteraction {
  id: string;
  target: string;
  action: string;
  block: number;
  time?: number;
  cursor: string;
}

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

export const QueryTab = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 65vh;
  margin-bottom: 1rem;
`;

const QueryBtns = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-end;
`;

const BookmarkProcess = styled(BookmarkIcon)<{ filled: boolean }>`
  width: 1em;
  height: 1em;
  color: #fff;
  cursor: pointer;
  transition: all .17s ease;

  &:hover {
    opacity: .85;
  }

  &:active {
    transform: scale(.9);
  }

  path {
    fill: ${(props) => props.filled ? "currentColor" : "none"};
  }
`;
