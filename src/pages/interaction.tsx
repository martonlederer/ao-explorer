import { getLinkedMessages, useMessageGraph, useProcessGraph } from "../utils/message_graph";
import { Copy, ProcessID, ProcessName, ProcessTitle, Space, Tables, Wrapper } from "../components/Page";
import { InteractionsCount, InteractionsMenu, InteractionsMenuItem, InteractionsWrapper, QueryTab } from "./process";
import { TransactionNode } from "../queries/messages";
import { formatAddress, formatJSONOrString, getTagValue } from "../utils/format";
import TagEl, { TagsWrapper } from "../components/Tag";
import { useMemo, useState } from "react";
import relativeTime from "dayjs/plugin/relativeTime";
import { useApolloClient } from "@apollo/client";
import { Editor } from "@monaco-editor/react";
import { result } from "@permaweb/aoconnect";
import { styled } from "@linaria/react";
import Table from "../components/Table";
import { LoadingStatus } from "./index";
import { Link } from "wouter";
import dayjs from "dayjs";
import { Graph, GraphNode, GraphLink, GraphConfiguration } from "react-d3-graph";
import { useLocation } from "wouter";
import { useResizeDetector } from "react-resize-detector";
import EntityLink from "../components/EntityLink";
import { Message, Tag } from "../ao/types";
import useGateway from "../hooks/useGateway";
import { useQuery } from "@tanstack/react-query";

dayjs.extend(relativeTime);

export default function Interaction({ message }: Props) {
  const gateway = useGateway();
  const client = useApolloClient();

  const tags = useMemo(() => Object.fromEntries(message.tags.map(t => [t.name, t.value])), [message]);
  const from = useMemo(() => tags["From-Process"] || message.owner.address, [message, tags]);
  const to = useMemo<string | undefined>(() => message.recipient, [message]);

  const { data = "" } = useQuery({
    queryKey: ["message-data", message.id, gateway],
    queryFn: async () => {
      const data = await (
        await fetch(`${gateway}/${message.id}`)
      ).text();

      return data;
    },
    select: (data) => data || "",
    staleTime: 10 * 60 * 1000
  });

  const { data: res } = useQuery({
    queryKey: ["message-result", message.id, to],
    queryFn: async () => {
      if (!to) return;

      const resultData = await result({
        message: message.id,
        process: to
      });

      for (const message of resultData.Messages as Message[]) {
        try {
          message.Data = JSON.parse(message.Data);
        } catch {}
      }

      return resultData;
    },
    enabled: !!to,
    staleTime: 10 * 60 * 1000
  });

  const { ref: graphRef, ...graphDimensions } = useResizeDetector();

  const { data: graphData, isLoading: loadingMessages } = useQuery({
    queryKey: ["graph-data", message.id, gateway],
    queryFn: async () => {
      return await getLinkedMessages(message, client);
    },
    staleTime: 10 * 60 * 1000
  });

  const messageGraphRaw = useMessageGraph(graphData);
  const messageGraph = useMemo(
    () => ({
      nodes: messageGraphRaw.nodes.map((n) => {
        if (n.id === message.id) {
          return {
            ...n,
            fontColor: "#04ff00"
          };
        }
        return n;
      }),
      links: messageGraphRaw.links
    }),
    [messageGraphRaw, message]
  );
  const processGraph = useProcessGraph(graphData);
  // const sortedGraph = useSortedGraph(messageGraph, graphDimensions, message);

  const linkedMessages = useMemo(
    () => {
      if (!graphData) return [];
      return [graphData.originalMessage, ...graphData.linkedMessages].filter(
        (node) => node.id !== message.id
      );
    },
    [graphData, message]
  );
  const resultingMessages = useMemo(
    () => {
      const linksFrom = messageGraph.links.filter((link) => link.source === message.id);
      return linkedMessages.filter((msg) => linksFrom.find((link) => link.target === msg.id));
    },
    [linkedMessages, messageGraph, message]
  );

  const [messagesMode, setMessagesMode] = useState<"resulting" | "linked">("resulting");
  const [graphMode, setGraphMode] = useState<"messages" | "processes">("messages");

  const graphConfig = useMemo<Partial<GraphConfiguration<GraphNode, GraphLink>>>(
    () => {
      const baseConfig = {
        directed: true,
        height: graphDimensions.height || 350,
        width: graphDimensions.width || 800,
        // staticGraph: true,
        node: {
          color: "#04ff00",
          size: 120,
          labelProperty: (node: GraphNode) => {
            if (graphMode === "processes") {
              return formatAddress(node.id, 8);
            }

            const action = getTagValue(
              "Action",
              [...(graphData?.linkedMessages || []), ...(graphData?.originalMessage ? [graphData.originalMessage] : [])].find(
                (msg) => msg.id === node.id
              )?.tags || []
            );

            if (!action) return formatAddress(node.id, 8);
            return formatAddress(node.id, 6) + "/" + action;
          },
          highlightStrokeColor: "blue",
          fontColor: "#fff"
        },
        link: {
          type: "CURVE_SMOOTH",
          highlightColor: "lightblue"
        },
        d3: {
          gravity: -200,
          linkLength: 150,
          alphaTarget: 0.05
        }
      };

      return baseConfig;
    },
    [graphData, graphDimensions, graphMode, processGraph]
  );

  const [, setLocation] = useLocation();

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
        {message.id}
        <Copy
          onClick={() => navigator.clipboard.writeText(message.id)}
        />
      </ProcessID>
      <Tables>
        <Table>
          <tr></tr>
          <tr>
            <td>From</td>
            <td>
              <EntityLink address={from} />
            </td>
          </tr>
          {to && (
            <tr>
              <td>To</td>
              <td>
                <EntityLink address={to} />
              </td>
            </tr>
          )}
          {tags.Action && (
            <tr>
              <td>Action</td>
              <td>
                {tags.Action || "-"}
              </td>
            </tr>
          )}
          <tr>
            <td>Variant</td>
            <td>
              {tags.Variant}
            </td>
          </tr>
          {tags["Pushed-For"] && tags["From-Process"] && (
            <tr>
              <td>
                Pushed-For
              </td>
              <td>
                <EntityLink address={tags["Pushed-For"]} />
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
              {(message.block?.timestamp && dayjs((message.block?.timestamp) * 1000).fromNow()) || "Pending..."}
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
            {typeof res?.Messages?.length !== "undefined" && (
              <InteractionsCount>
                {res.Messages.length.toLocaleString()}
              </InteractionsCount>
            )}
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={messagesMode === "linked"}
            onClick={() => setMessagesMode("linked")}
          >
            Linked messages
            <InteractionsCount>
              {linkedMessages.length.toLocaleString()}
            </InteractionsCount>
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
              <Link to={`#/${msg.id}`}>
                {formatAddress(msg.id)}
              </Link>
            </td>
            <td>
              {msg.tags.find((t: Tag) => t.name === "Action")?.value || "-"}
            </td>
            <td>
              <EntityLink address={getTagValue("From-Process", msg.tags) || msg.owner.address} />
            </td>
            <td>
              <EntityLink address={msg.recipient} />
            </td>
            <td>
              {(msg.block?.height && <Link to={`#/${msg.block.height}`}>{msg.block.height}</Link>) || "Pending..."}
            </td>
            <td>
              {(msg.block?.timestamp && dayjs(msg.block.timestamp * 1000).fromNow()) || "Pending..."}
            </td>
          </tr>
        ))}
      </Table>
      {(messagesMode === "resulting" && resultingMessages.length === 0 || messagesMode === "linked" && linkedMessages.length === 0) && !loadingMessages && (
        <LoadingStatus>
          No messages
          {!message.block && (res?.Messages?.length || 0) > 0 && " (Waiting for gateway to cache...)"}
        </LoadingStatus>
      )}
      {loadingMessages && (
        <LoadingStatus>
          Loading...
        </LoadingStatus>
      )}
      <Space />
      <InteractionsMenu>
        <InteractionsWrapper>
          <InteractionsMenuItem
            active={graphMode === "messages"}
            onClick={() => setGraphMode("messages")}
          >
            Message trace
          </InteractionsMenuItem>
          <InteractionsMenuItem
            active={graphMode === "processes"}
            onClick={() => setGraphMode("processes")}
          >
            Process trace
          </InteractionsMenuItem>
        </InteractionsWrapper>
      </InteractionsMenu>
      {((graphMode === "messages" ? messageGraph : processGraph).nodes.length > 0 && (
        <div ref={graphRef} style={{ height: "350px" }}>
          <Graph
            id="message-map"
            data={graphMode === "messages" ? messageGraph : processGraph}
            config={graphConfig}
            onClickNode={(node) => setLocation("/message/" + node)}
          />
        </div>
      )) || (
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
          language={tags.Action === "Eval" ? "lua" : "json"}
          value={formatJSONOrString(data) + "\n"}
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

const DataTitle = styled.p`
  color: #fff;
  font-family: "Inter", sans-serif;
  margin: 0;
`;

interface Props {
  message: TransactionNode;
}
