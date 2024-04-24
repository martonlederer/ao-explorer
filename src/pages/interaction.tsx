import { Copy, NotFound, ProcessID, ProcessTitle, Tables, Wrapper } from "../components/Page";
import arGql, { GetTransactionsQuery } from "arweave-graphql";
import { useEffect, useMemo, useRef, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import { formatAddress } from "../utils/format";
import { ArrowDownIcon, ShareIcon } from "@iconicicons/react";
import { result } from "@permaweb/aoconnect";
import { useGateway } from "../utils/hooks";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import { Link } from "wouter";
import dayjs from "dayjs"

dayjs.extend(relativeTime);

type Transaction = GetTransactionsQuery["transactions"]["edges"][0]

export default function Interaction({ process, interaction }: Props) {
  const [message, setMessage] = useState<Transaction | "loading">("loading");
  const gateway = useGateway();

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
      const resultData = await result({
        message: interaction,
        process
      });

      setRes(JSON.stringify(resultData || {}, null, 2));
    })();
  }, [process, interaction]);

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
          <tr>
            <td>Process</td>
            <td>
              <Link to={`#/process/${process}`}>
                {formatAddress(process)}
                <ShareIcon />
              </Link>
            </td>            
          </tr>
          {tags["Cranked-For"] && tags["From-Process"] && (
            <tr>
              <td>
                Cranked-For
              </td>
              <td>
                <Link to={`#/process/${tags["From-Process"]}/${tags["Cranked-For"]}`}>
                  {formatAddress(tags["Cranked-For"])}
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
          {data}
        </Data>
      </Tables>
      <Space />
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
  process: string;
  interaction: string;
}
