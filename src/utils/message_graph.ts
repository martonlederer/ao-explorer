import { result } from "@permaweb/aoconnect";
import { GetLinkedMessages, GetMessage, TransactionNode } from "../queries/messages";
import { getTagValue } from "./format";
import { ApolloClient } from "@apollo/client";
import { Message } from "../pages/interaction";
import { GraphNode, GraphLink, GraphData } from "react-d3-graph";
import { useEffect, useMemo, useState } from "react";
import dagre from "dagre";

export interface LinkedMessageData {
  originalMessage: TransactionNode;
  linkedMessages: TransactionNode[];
}

/**
 * Returns the linked messages for a given message object
 */
export async function getLinkedMessages(message: TransactionNode, client: ApolloClient<object>): Promise<LinkedMessageData> {
  // the message is the original message if it doesn't have a "Pushed-For" tag
  const pushedFor = getTagValue("Pushed-For", message.tags);
  let originalMessage = message;

  if (typeof pushedFor !== "undefined") {
    const res = await client.query({
      query: GetMessage,
      variables: { id: pushedFor }
    });
    if (res.data.transactions.edges.length === 0) {
      throw new Error("Could not find original message " + pushedFor);
    }

    originalMessage = res.data.transactions.edges[0].node;
  }

  // get linked messages
  const res = await client.query({
    query: GetLinkedMessages,
    variables: { pushedFor: originalMessage.id }
  });

  return {
    originalMessage,
    linkedMessages: res.data.transactions.edges.map((edge) => edge.node)
  };
}

export function useMessageGraph(data?: Awaited<ReturnType<typeof getLinkedMessages>>): GraphData<GraphNode, GraphLink> {
  // unsorted
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  async function getNeighbours(node: TransactionNode) {
    if (!data) return [];

    try {
      const res = await result({
        process: node.recipient,
        message: node.id
      });

      return data.linkedMessages.filter(
        (msg1) => !!(res.Messages || []).find(
          (msg2: Message) => getTagValue("Reference", msg1.tags) === getTagValue("Reference", msg2.Tags)
        )
      );
    } catch {}

    return [];
  }

  useEffect(() => {
    (async () => {
      setNodes([]);
      setLinks([]);

      if (!data) return;

      const links: GraphLink[] = [];
      const nodeQueue = [data.originalMessage];

      while (nodeQueue.length > 0) {
        const currentNode = nodeQueue.shift()!;
        const neighbours = await getNeighbours(currentNode);

        setNodes((val) => {
          val.push({ id: currentNode.id });
          return val;
        });

        for (const neighbour of neighbours) {
          links.push({
            source: currentNode.id,
            target: neighbour.id
          });
          nodeQueue.push(neighbour);
        }
      }

      setLinks(links);
    })();
  }, [data]);

  return { nodes, links };
}

export function useSortedGraph({ nodes, links }: GraphData<GraphNode, GraphLink>) {
  return useMemo(
    () => {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 100 });
      g.setDefaultEdgeLabel(() => ({}));

      for (const node of nodes) {
        g.setNode(node.id, { width: 100, height: 50 });
      }

      for (const link of links) {
        g.setEdge(link.source, link.target);
      }

      dagre.layout(g);

      return {
        nodes: nodes.map(n => {
          const { x, y } = g.node(n.id);
          return { ...n, x, y };
        }),
        links
      };
    },
    [nodes, links]
  )
}
