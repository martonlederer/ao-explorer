import { Copy, NotFound, ProcessID, ProcessTitle, Tables, Wrapper } from "../components/Page";
import arGql, { GetTransactionsQuery, Tag } from "arweave-graphql";
import { ArrowDownIcon, ShareIcon } from "@iconicicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatAddress, getTagValue } from "../utils/format";
import { terminalCodesToHtml } from "terminal-codes-to-html";
import relativeTime from "dayjs/plugin/relativeTime";
import { result } from "@permaweb/aoconnect";
import { useGateway } from "../utils/hooks";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import { Link } from "wouter";
import dayjs from "dayjs";

dayjs.extend(relativeTime);

type Transaction = GetTransactionsQuery["transactions"]["edges"][0]

export default function Interaction({ interaction }: Props) {
  const [message, setMessage] = useState<Transaction | "loading">("loading");
  const gateway = useGateway();

  const process = useMemo<string | undefined>(() => {
    if (message === "loading" || !message) return undefined;
    return message.node.recipient;
  }, [message]);

  useEffect(() => {
    (async () => {
      const res = await arGql(`${gateway}/graphql`).getTransactions({
        ids: [interaction],
        tags: [
          { name: "Data-Protocol", values: ["ao"] },
          { name: "Type", values: ["Message"] },
        ]
      });

      setMessage(res.transactions.edges[0]);
    })();
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
      const data = await (
        await fetch(`${gateway}/${interaction}`)
      ).text();

      setData(data || "");
    })();
  }, [interaction, gateway]);

  const [res, setRes] = useState<string>();

  useEffect(() => {
    (async () => {
      if (!process) return;
      const resultData = await result({
        message: interaction,
        process
      });

      setRes(JSON.stringify(resultData || {}, null, 2));
    })();
  }, [process, interaction]);

  const [messages, setMessages] = useState<GetTransactionsQuery["transactions"]["edges"]>([]);

  useEffect(() => {
    (async () => {
      const res = await arGql(`${gateway}/graphql`).getTransactions({
        tags: [
          { name: "Data-Protocol", values: ["ao"] },
          { name: "Type", values: ["Message"] },
          { name: "Pushed-For", values: [interaction] }
        ],
        first: 100000
      });

      setMessages(res.transactions.edges);
    })();
  }, [interaction, gateway]);

  const tagsRef = useRef<HTMLDivElement>();

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
              <a onClick={() => tagsRef.current?.scrollIntoView()}>
                View
                <ArrowDownIcon />
              </a>
            </td>
          </tr>
        </Table>
        <Data>
          <DataTitle>
            Data
          </DataTitle>
          <div dangerouslySetInnerHTML={{ __html: terminalCodesToHtml(data) }}></div>
        </Data>
      </Tables>
      <Space />
      {messages.length > 0 && (
        <>
          <ProcessID style={{ marginBottom: ".75rem" }}>
            Resulting messages
          </ProcessID>
          <Table>
            <tr>
              <th></th>
              <th>ID</th>
              <th>Action</th>
              <th>From</th>
              <th>Block</th>
              <th>Time</th>
            </tr>
            {messages.map((msg, i) => (
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
                  {process && (
                    <Link to={`#/process/${process}`}>
                      {formatAddress(process)}
                    </Link>
                  )}
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
          <Space />
        </>
      )}
      <Data>
        <DataTitle>
          Result
        </DataTitle>
        {res || ""}
      </Data>
      <Space />
      <Data ref={tagsRef as any}>
        <DataTitle>
          Tags
        </DataTitle>
        {JSON.stringify(tags || {}, null, 2)}
      </Data>
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
  position: absolute;
  top: .7rem;
  left: .7rem;
  color: #fff;
  font-family: "Inter", sans-serif;
  margin: 0;
  z-index: 10;
`;

const Space = styled.div`
  height: 3rem;
`;

interface Props {
  interaction: string;
}
