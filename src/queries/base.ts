import { TypedDocumentNode, gql } from "@apollo/client";
import { TransactionNode } from "./messages";

export interface GetTransactionType {
  transactions: {
    edges: {
      node: FullTransactionNode;
    }[];
  };
}

export interface FullTransactionNode extends TransactionNode {
  signature: string;
  quantity: {
    ar: string;
  };
  fee: {
    ar: string;
  };
  data: {
    size: string;
    type?: string;
  };
  bundledIn: {
    id: string;
  } | null;
}

export const GetTransaction: TypedDocumentNode<GetTransactionType, { id: string }> = gql`
  query GetTransaction ($id: ID!) {
    transactions(
      ids: [$id],
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
          signature
          quantity {
            ar
          }
          fee {
            ar
          }
          data {
            size
            type
          }
          bundledIn {
            id
          }
        }
      }
    }
  }
`;

export interface FullTransactionNodeQueryType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    edges: {
      node: FullTransactionNode;
      cursor: string;
    }[];
  };
}

export const GetOutgoingTransactions: TypedDocumentNode<FullTransactionNodeQueryType, { owner: string; cursor?: string }> = gql`
  query GetOutgoingMessages ($owner: String!, $cursor: String) {
    transactions(
      owners: [$owner]
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
          signature
          quantity {
            ar
          }
          fee {
            ar
          }
          data {
            size
            type
          }
          bundledIn {
            id
          }
        }
        cursor
      }
    }
  }
`;

export const GetIncomingTransactions: TypedDocumentNode<FullTransactionNodeQueryType, { recipient: string; cursor?: string }> = gql`
  query GetOutgoingMessages ($recipient: String!, $cursor: String) {
    transactions(
      recipients: [$recipient]
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
          signature
          quantity {
            ar
          }
          fee {
            ar
          }
          data {
            size
            type
          }
          bundledIn {
            id
          }
        }
        cursor
      }
    }
  }
`;
