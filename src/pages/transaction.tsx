import { useEffect, useMemo, useState } from "react";
import { Copy, ProcessID, ProcessTitle, Space, Tables, Wrapper } from "../components/Page";
import Table from "../components/Table";
import EntityLink from "../components/EntityLink";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import TagEl, { TagsWrapper } from "../components/Tag";
import { styled } from "@linaria/react";
import { FullTransactionNode } from "../queries/base";
import { formatJSONOrString, formatQuantity } from "../utils/format";
import { Link } from "wouter";
import prettyBytes from "pretty-bytes";
import { useGateway } from "../utils/hooks";
import { QueryTab } from "./process";
import { Editor } from "@monaco-editor/react";

dayjs.extend(relativeTime);

export default function Transaction({ transaction }: Props) {
  const tags = useMemo(() => Object.fromEntries(transaction.tags.map(t => [t.name, t.value])), [transaction]);
  const dataType = useMemo(() => transaction.data.type?.split("/")?.[0], [transaction]);

  const [confirmations, setConfirmations] = useState(0);
  const gateway = useGateway();

  useEffect(() => {
    (async () => {
      const res = await (
        await fetch(`${gateway}/tx/${transaction.id}/status`)
      ).json();

      setConfirmations(res?.number_of_confirmations || 0);
    })();
  }, [transaction.id, gateway]);

  const [data, setData] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`${gateway}/${transaction.id}`);

      if (dataType === "image") {
        const raw = await res.blob();
        const reader = new FileReader() ;
        reader.onload = () => setData(reader.result as string);
        reader.readAsDataURL(raw) ;
      } else {
        setData(await res.text() || "")
      }
    })();
  }, [transaction, gateway, dataType]);

  return (
    <Wrapper>
      <ProcessTitle>
        Transaction
      </ProcessTitle>
      <ProcessID>
        {transaction.id}
        <Copy
          onClick={() => navigator.clipboard.writeText(transaction.id)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>Owner</td>
            <td>
              <EntityLink address={transaction.owner.address} />
            </td>
          </tr>
          {transaction.recipient && (
            <tr>
              <td>Recipient</td>
              <td>
                <EntityLink address={transaction.recipient} />
              </td>
            </tr>
          )}
          <tr>
            <td>Quantity</td>
            <td>
              {formatQuantity(transaction.quantity.ar)}
              {" AR"}
            </td>
          </tr>
          <tr>
            <td>Fee</td>
            <td>
              {formatQuantity(transaction.fee.ar)}
              {" AR"}
            </td>
          </tr>
          <tr>
            <td>Timestamp</td>
            <td>
              {(transaction.block?.timestamp && dayjs((transaction.block?.timestamp) * 1000).format("MMM DD, YYYY hh:mm:ss")) || "Just now"}
            </td>
          </tr>
          {transaction.block && (
            <tr>
              <td>Block</td>
              <td>
                <Link to={`#/${transaction.block.height}`}>
                  {transaction.block.height}
                </Link>
              </td>
            </tr>
          )}
          <tr>
            <td>Confirmations</td>
            <td>
              {confirmations.toLocaleString()}
            </td>
          </tr>
          {transaction.bundledIn && (
            <tr>
              <td>Bundle</td>
              <td>
                <EntityLink address={transaction.bundledIn.id} />
              </td>
            </tr>
          )}
          <tr>
            <td>Size</td>
            <td>
              {prettyBytes(parseInt(transaction.data.size))}
            </td>
          </tr>
          {transaction.data.type && (
            <tr>
              <td>Content-Type</td>
              <td>
                {transaction.data.type}
              </td>
            </tr>
          )}
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
      <QueryTab style={{ gap: "1rem 2rem" }}>
        <DataTitle>Signature</DataTitle>
        <DataTitle>Data</DataTitle>
        <Editor
          theme="vs-dark"
          defaultLanguage="json"
          defaultValue={""}
          value={transaction.signature + "\n"}
          options={{ minimap: { enabled: false }, readOnly: true, wordWrap: true }}
        />
        {dataType === "image" && (
          <Image src={data} draggable={false} />
        ) || (
          <Editor
            theme="vs-dark"
            defaultLanguage="json"
            defaultValue={"{}\n"}
            language={transaction.data.type?.split("/")?.[1]}
            value={formatJSONOrString(data) + "\n"}
            options={{ minimap: { enabled: false }, readOnly: true }}
          />
        )}
      </QueryTab>
      <Space />
    </Wrapper>
  );
}

const DataTitle = styled.p`
  color: #fff;
  font-family: "Inter", sans-serif;
  margin: 0;
`;

const Image = styled.img`
  width: 100%;
  user-select: none;
`;

interface Props {
  transaction: FullTransactionNode;
}
