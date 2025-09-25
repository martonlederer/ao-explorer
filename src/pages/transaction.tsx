import { useEffect, useMemo, useState } from "react";
import { Copy, ProcessID, ProcessTitle, Space, Tables, Title, Wrapper } from "../components/Page";
import Table, { TransactionType } from "../components/Table";
import EntityLink from "../components/EntityLink";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import TagEl, { TagsWrapper } from "../components/Tag";
import { styled } from "@linaria/react";
import { FullTransactionNode, GetTransactionsInBundle } from "../queries/base";
import { formatAddress, formatJSONOrString, formatQuantity, getTagValue } from "../utils/format";
import { Link } from "wouter";
import prettyBytes from "pretty-bytes";
import { QueryTab, formatTimestamp } from "./process";
import { Editor } from "@monaco-editor/react";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { useApolloClient } from "@apollo/client";
import { TransactionListItem } from "./wallet";
import { GetProcessesForModule } from "../queries/processes";
import useGateway from "../hooks/useGateway";
import { useQuery } from "@tanstack/react-query";

dayjs.extend(relativeTime);

export default function Transaction({ transaction }: Props) {
  const tags = useMemo(() => Object.fromEntries(transaction.tags.map(t => [t.name, t.value])), [transaction]);
  const dataType = useMemo(() => transaction.data.type?.split("/")?.[0], [transaction]);

  const gateway = useGateway();

  const { data: confirmations = 0 } = useQuery({
    queryKey: ["transaction-confirmations", transaction.id, gateway],
    queryFn: async () => {
      const res = await (
        await fetch(`${gateway}/tx/${transaction.id}/status`)
      ).json();

      return res?.number_of_confirmations || 0;
    },
    staleTime: 60 * 1000
  });

  const { data = "" } = useQuery({
    queryKey: ["transaction-data", transaction.id, gateway, dataType],
    queryFn: () => new Promise<string>(async (resolve, reject) => {
      const res = await fetch(`${gateway}/${transaction.id}`);

      if (dataType === "image") {
        const raw = await res.blob();
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;

        reader.readAsDataURL(raw);
      } else {
        resolve(await res.text());
      }
    }),
    select: (val) => val || "",
    staleTime: 5 * 60 * 1000
  });

  const isBundle = useMemo(
    () => typeof tags["Bundle-Format"] !== "undefined" || typeof tags["Bundle-Version"] !== "undefined",
    [tags]
  );

  const client = useApolloClient();

  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);

  async function fetchTransactions() {
    if (!isBundle) return;
    const res = await client.query({
      query: GetTransactionsInBundle,
      variables: {
        bundle: transaction.id,
        cursor: transactions[transactions.length - 1]?.cursor
      }
    });

    setHasMoreTransactions(res.data.transactions.pageInfo.hasNextPage);
    setTransactions((val) => {
      // manually filter out duplicate transactions
      // for some reason, the ar.io nodes return the
      // same transaction multiple times for certain
      // queries
      for (const tx of res.data.transactions.edges) {
        val.push({
          // @ts-expect-error
          type: tx.node.tags.find((tag) => tag.name === "Type")?.value || "Transaction",
          id: tx.node.id,
          owner: tx.node.tags.find((tag) => tag.name === "From-Process")?.value || tx.node.owner.address,
          target: tx.node.recipient,
          action: tx.node.tags.find((tag) => tag.name === "Action")?.value || "-",
          block: tx.node.block?.height || 0,
          time: tx.node.block?.timestamp,
          original: tx.node,
          cursor: tx.cursor
        });
      }

      return val;
    });
  }

  useEffect(() => {
    setTransactions([]);
    setHasMoreTransactions(true);
    fetchTransactions();
  }, [transaction.id, isBundle]);

  const isModule = useMemo(
    () => tags.Type === "Module" && tags["Data-Protocol"] === "ao",
    [tags]
  );

  const [hasMoreProcesses, setHasMoreProcesses] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);

  async function fetchProcesses() {
    const res = await client.query({
      query: GetProcessesForModule,
      variables: {
        module: transaction.id,
        cursor: processes[processes.length - 1]?.cursor
      }
    });

    setHasMoreProcesses(res.data.transactions.pageInfo.hasNextPage);
    setProcesses((val) => {
      for (const tx of res.data.transactions.edges) {
        if (val.find((t) => t.id === tx.node.id)) continue;
        val.push({
          id: tx.node.id,
          name: getTagValue("Name", tx.node.tags) || "-",
          owner: getTagValue("From-Process", tx.node.tags) || tx.node.owner.address,
          block: tx.node.block?.height || 0,
          time: tx.node.block?.timestamp || 0,
          cursor: tx.cursor
        });
      }

      return val;
    });
  }

  useEffect(() => {
    setProcesses([]);
    setHasMoreProcesses(true);
    fetchProcesses();
  }, [transaction.id, isModule]);

  return (
    <Wrapper>
      <ProcessTitle>
        {(isBundle && "Bundle" ) || (isModule && "Module") || "Transaction"}
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
      <Space y={isBundle || isModule ? 1 : 3} />
      {!isBundle && !isModule && (
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
      )}
      {isBundle && (
        <>
          <Title>
            Transactions
          </Title>
          <InfiniteScroll
            dataLength={transactions.length}
            next={fetchTransactions}
            hasMore={hasMoreTransactions}
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
              {transactions.map((tx, i) => (
                <tr key={i}>
                  <td>
                    <TransactionType>
                      {tx.type}
                    </TransactionType>
                  </td>
                  <td>
                    <EntityLink address={tx.id} transaction={tx.original} idonly />
                  </td>
                  <td>
                    {tx.action}
                  </td>
                  <td>
                    <EntityLink address={tx.owner} />
                  </td>
                  <td>
                    {(tx.block && <Link to={`#/${tx.block}`}>{tx.block}</Link>) || "Pending..."}
                  </td>
                  <td>
                    {formatTimestamp(tx.time && tx.time * 1000)}
                  </td>
                </tr>
              ))}
            </Table>
          </InfiniteScroll>
        </>
      )}
      {isModule && (
        <>
          <Title>
            Processes
          </Title>
          <InfiniteScroll
            dataLength={processes.length}
            next={fetchProcesses}
            hasMore={hasMoreProcesses}
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
                <th>Name</th>
                <th>Process ID</th>
                <th>Owner</th>
                <th>Block</th>
                <th>Time</th>
              </tr>
              {processes.map((process, i) => (
                <tr key={i}>
                  <td></td>
                  <td>
                    <Link to={`#/${process.id}`} style={{ textOverflow: "ellipsis", maxWidth: "17rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {process.name}
                    </Link>
                  </td>
                  <td>
                    <Link to={`#/${process.id}`}>
                      {formatAddress(process.id, 7)}
                    </Link>
                  </td>
                  <td>
                    <EntityLink address={process.owner} />
                  </td>
                  <td>
                    {(process.block && <Link to={`#/${process.block}`}>{process.block}</Link>) || ""}
                  </td>
                  <td>
                    {formatTimestamp(process.time && process.time * 1000)}
                  </td>
                </tr>
              ))}
            </Table>
          </InfiniteScroll>
        </>
      )}
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

interface Process {
  id: string;
  name: string;
  owner: string;
  block?: number;
  time?: number;
  cursor: string;
}
