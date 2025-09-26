import { useMemo } from "react";
import { Copy, ProcessID, ProcessTitle, Space, Tables, Title, Wrapper } from "../components/Page";
import Table, { TransactionType } from "../components/Table";
import EntityLink from "../components/EntityLink";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import TagEl, { TagsWrapper } from "../components/Tag";
import { styled } from "@linaria/react";
import { FullTransactionNode, GetTransactionsInBundle, defaultGraphqlTransactions } from "../queries/base";
import { formatAddress, formatJSONOrString, formatQuantity, getTagValue, getTransactionType } from "../utils/format";
import { Link } from "wouter";
import prettyBytes from "pretty-bytes";
import { QueryTab, formatTimestamp } from "./process";
import { Editor } from "@monaco-editor/react";
import InfiniteScroll from "react-infinite-scroll-component";
import { LoadingStatus } from ".";
import { useApolloClient } from "@apollo/client";
import { GetProcessesForModule, GetProcessesForModuleCount } from "../queries/processes";
import useGateway from "../hooks/useGateway";
import { useQuery } from "@tanstack/react-query";
import { useQuery as useApolloQuery } from "@apollo/client";

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
  const {
    data: transactions = defaultGraphqlTransactions,
    fetchMore: fetchMoreTransactions
  } = useApolloQuery(GetTransactionsInBundle, {
    variables: { bundle: transaction.id },
    skip: !isBundle
  });

  const client = useApolloClient();

  const isModule = useMemo(
    () => tags.Type === "Module" && tags["Data-Protocol"] === "ao",
    [tags]
  );

  const { data: moduleSpawnCountData } = useApolloQuery(GetProcessesForModuleCount, {
    variables: { module: transaction.id },
    skip: !isModule
  });
  const moduleSpawnCount = useMemo(
    () => {
      const raw = parseInt(moduleSpawnCountData?.transactions?.count || "0");
      return raw.toLocaleString();
    },
    [moduleSpawnCountData]
  );

  const {
    data: processes = defaultGraphqlTransactions,
    fetchMore: fetchMoreProcesses
  } = useApolloQuery(GetProcessesForModule, {
    variables: { module: transaction.id },
    skip: !isModule
  });

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
          {transaction.quantity.ar !== "0" && (
            <tr>
              <td>Quantity</td>
              <td>
                {formatQuantity(transaction.quantity.ar)}
                {" AR"}
              </td>
            </tr>
          )}
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
          {isModule && (
            <tr>
              <td>Processes</td>
              <td>
                {moduleSpawnCount}
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
            dataLength={transactions.transactions.edges.length}
            next={() => fetchMoreTransactions({
              variables: {
                cursor: transactions.transactions.edges[transactions.transactions.edges.length - 1].cursor
              }
            })}
            hasMore={transactions.transactions.pageInfo.hasNextPage}
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
              {transactions.transactions.edges.map((tx, i) => (
                <tr key={i}>
                  <td>
                    <TransactionType>
                      {getTransactionType(tx.node.tags)}
                    </TransactionType>
                  </td>
                  <td>
                    <EntityLink address={tx.node.id} transaction={tx.node} idonly />
                  </td>
                  <td>
                    {getTagValue("Action", tx.node.tags)}
                  </td>
                  <td>
                    <EntityLink address={getTagValue("From-Process", tx.node.tags) || tx.node.owner.address} />
                  </td>
                  <td>
                    {(tx.node.block?.height && <Link to={`#/${tx.node.block?.height}`}>{tx.node.block?.height}</Link>) || "Pending..."}
                  </td>
                  <td>
                    {formatTimestamp(tx.node.block?.timestamp && tx.node.block.timestamp * 1000)}
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
            dataLength={processes.transactions.edges.length}
            next={() => fetchMoreProcesses({
              variables: {
                cursor: processes.transactions.edges[processes.transactions.edges.length - 1].cursor
              }
            })}
            hasMore={processes.transactions.pageInfo.hasNextPage}
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
              {processes.transactions.edges.map((process, i) => (
                <tr key={i}>
                  <td></td>
                  <td>
                    <Link to={`#/${process.node.id}`} style={{ textOverflow: "ellipsis", maxWidth: "17rem", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {getTagValue("Name", process.node.tags) || "-"}
                    </Link>
                  </td>
                  <td>
                    <Link to={`#/${process.node.id}`}>
                      {formatAddress(process.node.id, 7)}
                    </Link>
                  </td>
                  <td>
                    <EntityLink address={getTagValue("From-Process", process.node.tags) || process.node.owner.address} />
                  </td>
                  <td>
                    {(process.node.block?.height && <Link to={`#/${process.node.block.height}`}>{process.node.block.height}</Link>) || ""}
                  </td>
                  <td>
                    {formatTimestamp(process.node.block?.timestamp && process.node.block?.timestamp * 1000)}
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
