import { InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, QueryTab } from "./process";
import { Copy, NotFound, ProcessID, ProcessName, ProcessTitle, Tables, Wrapper } from "../components/Page";
import { MessageResult } from "@permaweb/aoconnect/dist/lib/result";
import arGql, { GetTransactionsQuery, Tag } from "arweave-graphql";
import { formatAddress, getTagValue } from "../utils/format";
import { terminalCodesToHtml } from "terminal-codes-to-html";
import TagEl, { TagsWrapper } from "../components/Tag";
import { useEffect, useMemo, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import { ShareIcon } from "@iconicicons/react";
import { Editor } from "@monaco-editor/react";
import { result } from "@permaweb/aoconnect";
import { useGateway } from "../utils/hooks";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import { Link } from "wouter";
import dayjs from "dayjs";
import { LoadingStatus } from ".";

dayjs.extend(relativeTime);

type Transaction = GetTransactionsQuery["transactions"]["edges"][0]
export interface Message {
  Anchor: string;
  Tags: Tag[];
  Target: string;
  Data: string;
}

export default function Interaction({ interaction }: Props) {
  const [message, setMessage] = useState<Transaction | "loading" | undefined>("loading");
  const gateway = useGateway();

  const process = useMemo<string | undefined>(() => {
    if (message === "loading" || !message) return undefined;
    return message.node.recipient;
  }, [message]);

  const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  useEffect(() => {
    let cancel = false;

    (async () => {
      let tries = 0;

      while (tries < 5) {
        try {
          // get output for token qty
          const res = await arGql(`${gateway}/graphql`).getTransactions({
            ids: [interaction],
            tags: [
              { name: "Data-Protocol", values: ["ao"] },
              { name: "Type", values: ["Message"] },
            ]
          });

          if (cancel) return;

          // breaks
          if (res.transactions.edges[0]) {
            return setMessage(res.transactions.edges[0]);
          }

          // wait a bit to see if the interaction loads
          await wait(4000);
        } catch {}
        tries++;
      }

      setMessage(undefined);
    })();

    return () => {
      cancel = true;
    };
  }, [process, interaction, gateway]);

  const tags = useMemo(() => {
    const tagRecord: { [name: string]: string } = {};

    if (!message || message == "loading")
      return tagRecord;

    for (const tag of message.node.tags) {
      tagRecord[tag.name] = tag.value
    }

    return tagRecord;
  }, [message]);

  const [data, setData] = useState("");

  useEffect(() => {
    (async () => {
      if (!message || message === "loading") return;
      setData("");

      const data = await (
        await fetch(`${gateway}/${message.node.id}`)
      ).text();
console.log(data)
      setData(data || "");
    })();
  }, [gateway, message]);

  const [res, setRes] = useState<MessageResult>();

  useEffect(() => {
    (async () => {
      if (!process || !message || message === "loading") return;
      setRes(undefined);

      const resultData = await result({
        message: message.node.id,
        process
      });

      setRes(resultData);
    })();
  }, [process, message]);

  const [resultingMessages, setResultingMessages] = useState<GetTransactionsQuery["transactions"]["edges"]>([]);
  const [linkedMessages, setLinkedMessages] = useState<GetTransactionsQuery["transactions"]["edges"]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    (async () => {
      if (!message || message === "loading" || !res) return;
      setLoadingMessages(true);
      try {
        const pushedMessages = await arGql(`${gateway}/graphql`).getTransactions({
          tags: [
            { name: "Data-Protocol", values: ["ao"] },
            { name: "Type", values: ["Message"] },
            { name: "Pushed-For", values: [tags["Pushed-For"] || message.node.id] }
          ],
          first: 100000
        });

        setLinkedMessages(pushedMessages.transactions.edges.filter(
          (edge) => edge.node.id !== message.node.id)
        );

        // array of references from the messages produced by this interaction
        // this is required to filter out messages pushed for this interaction,
        // from all messages pushed for the original message
        const resultingRefs = res.Messages
          .map((msg: Message) => getTagValue("Ref_", msg.Tags) || getTagValue("Reference", msg.Tags))
          .filter((ref: string | undefined) => typeof ref === "string");

        setResultingMessages(pushedMessages.transactions.edges.filter(
          (edge) => {
            const ref = getTagValue("Ref_", edge.node.tags) || getTagValue("Reference", edge.node.tags);

            return ref && resultingRefs.includes(ref) && edge.node.id !== message.node.id;
          }
        ));
      } catch {}
      setLoadingMessages(false);
    })();
  }, [message, gateway, res]);

  const [messagesMode, setMessagesMode] = useState<"resulting" | "linked">("resulting");

  if (!message || message == "loading") {
    return (
      <Wrapper>
        <NotFound>
          {(!message && "Could not find message") || "Loading..."}
        </NotFound>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <ProcessTitle>
        Message
        {tags.Action && (
          <ProcessName>
            {tags.Action}
            {tags["X-Action"] && ("/" + tags["X-Action"])}
          </ProcessName>
        )}
      </ProcessTitle>
      <ProcessID>
        {interaction}
        <Copy
          onClick={() => navigator.clipboard.writeText(interaction)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Owner</td>
            <td>
              <a href={`https://viewblock.io/arweave/address/${message.node.owner.address}`} target="_blank" rel="noopener noreferer">
                {formatAddress(message.node.owner.address)}
                <ShareIcon />
              </a>
            </td>
          </tr>
          {tags["From-Process"] && (
            <tr>
              <td>
                From-Process
              </td>
              <td>
                <Link to={`#/process/${tags["From-Process"]}`}>
                  {formatAddress(tags["From-Process"])}
                  <ShareIcon />
                </Link>
              </td>
            </tr>
          )}
          <tr>
            <td>Variant</td>
            <td>
              {tags.Variant}
            </td>
          </tr>
          {tags.Action && (
            <tr>
              <td>Action</td>
              <td>
                {tags.Action || "-"}
              </td>
            </tr>
          )}
          {process && (
            <tr>
              <td>Process</td>
              <td>
                <Link to={`#/process/${process}`}>
                  {formatAddress(process)}
                  <ShareIcon />
                </Link>
              </td>
            </tr>
          )}
          {tags["Pushed-For"] && tags["From-Process"] && (
            <tr>
              <td>
                Pushed-For
              </td>
              <td>
                <Link to={`#/message/${tags["Pushed-For"]}`}>
                  {formatAddress(tags["Pushed-For"])}
                  <ShareIcon />
                </Link>
              </td>
            </tr>
          )}
          {tags.SDK && (
            <tr>
              <td>SDK</td>
              <td>
                {tags.SDK || "-"}
              </td>
            </tr>
          )}
          <tr>
            <td>Timestamp</td>
            <td>
              {(message.node.block?.timestamp && dayjs((message.node.block?.timestamp) * 1000).fromNow()) || "Pending..."}
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
        </Table>
      </Tables>
      <Space />
      <InteractionsMenu>
        <InteractionsWrapper>
          <InteractionsMenuItem
            active={messagesMode === "resulting"}
            onClick={() => setMessagesMode("resulting")}
          >
            Resulting messages
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={messagesMode === "linked"}
            onClick={() => setMessagesMode("linked")}
          >
            Linked messages
          </InteractionsMenuItem>
        </InteractionsWrapper>
      </InteractionsMenu>
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
        {((messagesMode === "resulting" && resultingMessages) || linkedMessages).map((msg, i) => (
          <tr key={i}>
            <td></td>
            <td>
              <Link to={`#/message/${msg.node.id}`}>
                {formatAddress(msg.node.id)}
              </Link>
            </td>
            <td>
              {msg.node.tags.find((t: Tag) => t.name === "Action")?.value || "-"}
            </td>
            <td>
              <Link to={`#/process/${getTagValue("From-Process", msg.node.tags) || msg.node.owner.address}`}>
                {formatAddress(getTagValue("From-Process", msg.node.tags) || msg.node.owner.address)}
              </Link>
            </td>
            <td>
              <Link to={`#/process/${msg.node.recipient}`}>
                {formatAddress(msg.node.recipient)}
              </Link>
            </td>
            <td>
              {msg.node.block?.height || "Pending..."}
            </td>
            <td>
              {(msg.node.block?.timestamp && dayjs(msg.node.block.timestamp * 1000).fromNow()) || "Pending..."}
            </td>
          </tr>
        ))}
      </Table>
      {(messagesMode === "resulting" && resultingMessages.length === 0 || messagesMode === "linked" && linkedMessages.length === 0) && !loadingMessages && (
        <LoadingStatus>
          No messages
          {!message.node.block && (res?.Messages?.length || 0) > 0 && " (Waiting for gateway to cache...)"}
        </LoadingStatus>
      )}
      {loadingMessages && (
        <LoadingStatus>
          Loading...
        </LoadingStatus>
      )}
      <Space />
      <QueryTab style={{ gap: "1rem 2rem" }}>
        <DataTitle>Data</DataTitle>
        <DataTitle>Result</DataTitle>
        <Editor
          theme="vs-dark"
          defaultLanguage="json"
          defaultValue={"{}\n"}
          value={(data || "{}") + "\n"}
          options={{ minimap: { enabled: false }, readOnly: true }}
        />
        <Editor
          theme="vs-dark"
          defaultLanguage="json"
          defaultValue={"{}\n"}
          value={JSON.stringify(res || {}, null, 2) + "\n"}
          options={{ minimap: { enabled: false }, readOnly: true }}
        />
      </QueryTab>
      <Space />
    </Wrapper>
  );
}

const Data = styled.div`
  position: relative;
  background-color: rgba(255, 255, 255, .05);
  padding: .7rem;
  padding-top: 2rem;
  font-family: "Space Mono", monospace;
  font-size: 1rem;
  color: #cbcbcb;
  overflow: auto;
  white-space: break-spaces;
`;

const DataTitle = styled.p`
  color: #fff;
  font-family: "Inter", sans-serif;
  margin: 0;
`;

const Space = styled.div`
  height: 3rem;
`;

interface Props {
  interaction: string;
}
