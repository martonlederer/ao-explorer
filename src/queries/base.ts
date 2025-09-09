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

export interface GetOutgoingTransactionsType {
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

export const GetOutgoingTransactions: TypedDocumentNode<GetOutgoingTransactionsType, { owner: string; cursor?: string }> = gql`
  query GetOutgoingMessages ($owner: String!, $cursor: String) {
    transactions(
      owners: [$owner]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
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
