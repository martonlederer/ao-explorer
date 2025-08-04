import { gql, TypedDocumentNode } from "@apollo/client";
import { Tag } from "./processes";

interface Block {
  height: number;
  timestamp: number;
}

interface GetAllMessagesType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    edges: {
      node: TransactionNode;
      cursor: string;
    }[];
  };
}

export interface TransactionNode {
  id: string;
  tags: Tag[];
  owner: {
    address: string;
  };
  recipient: string;
  block?: Block;
}

interface GetMessageType {
  transactions: {
    edges: {
      node: TransactionNode;
    }[];
  };
}

export const GetAllMessages: TypedDocumentNode<GetAllMessagesType, { cursor?: string }> = gql`
  query GetAllMessages ($cursor: String) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Message"] }
      ],
      first: 100
      after: $cursor
    ) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
          }
          recipient
          block {
            height
            timestamp
          }
        }
        cursor
      }
    }
  }
`;

export const GetMessage: TypedDocumentNode<GetMessageType, { id: string }> = gql`
  query GetMessage ($id: ID!) {
    transactions(
      ids: [$id]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Message"] }
      ],
      first: 1
    ) {
      edges {
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
          }
          recipient
          block {
            height
            timestamp
          }
        }
      }
    }
  }
`;

export const GetLinkedMessages: TypedDocumentNode<GetMessageType, { pushedFor: string }> = gql`
  query GetLinkedMessages ($pushedFor: ID!) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Message"] }
        { name: "Pushed-For", values: [$pushedFor] }
      ],
      first: 100
    ) {
      edges {
        node {
          id
          tags {
            name
            value
          }
          owner {
            address
          }
          recipient
          block {
            height
            timestamp
          }
        }
      }
    }
  }
`;
