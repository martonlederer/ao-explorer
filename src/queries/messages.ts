import { gql, TypedDocumentNode } from "@apollo/client";
import { Tag } from "./processes";

export interface Block {
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

export interface GetMessageType {
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

export interface GetMessageWithCountType extends GetMessageType {
  transactions: GetMessageType["transactions"] & {
    count: string;
  };
}

export const GetLinkedMessages: TypedDocumentNode<GetMessageWithCountType, { pushedFor: string }> = gql`
  query GetLinkedMessages ($pushedFor: String!) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Message"] }
        { name: "Pushed-For", values: [$pushedFor] }
      ],
      first: 100
    ) {
      count
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

interface GetIncomingMessagesCountType {
  transactions: {
    count: string;
  };
}

export const GetIncomingMessagesCount: TypedDocumentNode<GetIncomingMessagesCountType, { process: string; }> = gql`
  query GetIncomingMessagesCount ($process: String!) {
    transactions(
      recipients: [$process]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
      ],
    ) {
      count
    }
  }
`;

interface GetEvalMessagesType extends GetAllMessagesType {
  transactions: GetAllMessagesType["transactions"] & {
    count: string;
  };
}

export const GetEvalMessages: TypedDocumentNode<GetEvalMessagesType, { process: string; cursor?: string }> = gql`
  query GetEvalMessages ($process: String!, $cursor: String) {
    transactions(
      recipients: [$process]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Action", values: ["Eval"] }
      ],
      first: 100
      after: $cursor
    ) {
      pageInfo {
        hasNextPage
      }
      count
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

interface GetOutgoingMessagesType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    count: string;
    edges: {
      node: Omit<TransactionNode, "owner">;
      cursor: string;
    }[];
  };
}

export const GetOutgoingMessages: TypedDocumentNode<GetOutgoingMessagesType, { process: string; cursor?: string }> = gql`
  query GetOutgoingMessages ($process: String!, $cursor: String) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "From-Process", values: [$process] }
      ],
      first: 100
      after: $cursor
    ) {
      pageInfo {
        hasNextPage
      }
      count
      edges {
        node {
          id
          tags {
            name
            value
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

interface GetTransfersForType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    count: string;
    edges: {
      node: Omit<TransactionNode, "recipient">;
      cursor: string;
    }[];
  };
}

export const GetTransfersFor: TypedDocumentNode<GetTransfersForType, { process: string; cursor?: string }> = gql`
  query GetTransfersFor ($process: String!, $cursor: String) {
    transactions(
      recipients: [$process]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Message"] }
        { name: "Action", values: ["Credit-Notice", "Debit-Notice"] }
      ],
      first: 100
      after: $cursor
    ) {
      pageInfo {
        hasNextPage
      }
      count
      edges {
        node {
          id
          tags {
            name
            value
          }
          block {
            height
            timestamp
          }
          recipient
        }
        cursor
      }
    }
  }
`;
