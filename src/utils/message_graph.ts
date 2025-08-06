import { result } from "@permaweb/aoconnect";
import { GetLinkedMessages, GetMessage, TransactionNode } from "../queries/messages";
import { getTagValue } from "./format";
import { ApolloClient } from "@apollo/client";
import { Message } from "../pages/interaction";

/**
 * Returns the linked messages for a given message object
 */
export async function getLinkedMessages(message: TransactionNode, client: ApolloClient<object>) {
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

export async function generateMessageGraph(data: Awaited<ReturnType<typeof getLinkedMessages>>) {
  const getNeighbours = async (node: TransactionNode) => {
    const res = await result({
      process: node.recipient,
      message: node.id
    });

    return data.linkedMessages.filter(
      (msg1) => !!res.Messages.find(
        (msg2) => getTagValue("Reference", msg1.tags) === getTagValue("Reference", msg2.tags)
      )
    );
  };

  const nodes: { id: string }[] = [];
  const links: { source: string; target: string }[] = [];
  const nodeQueue = [data.originalMessage];

  while (nodeQueue.length > 0) {
    const currentNode = nodeQueue.shift()!;
    const neighbours = await getNeighbours(currentNode);

    nodes.push({ id: currentNode.id });

    for (const neighbour of neighbours) {
      links.push({
        source: currentNode.id,
        target: neighbour.id
      });
      nodeQueue.push(neighbour);
    }
  }

  return { nodes, links };
}

/**
 * Gets the result of multiple messages
 */
export async function getMessageResults(process: string, messages: TransactionNode[]) {
  return await Promise.all(messages.map(async (msg) => {
    const res = await result({
      process,
      message: msg.id
    });

    return {
      ...msg,
      results: (res.Messages || []) as Message[]
    };
  }));
}
