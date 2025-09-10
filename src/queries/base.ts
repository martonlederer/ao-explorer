import { TypedDocumentNode, gql } from "@apollo/client";
import { TransactionNode } from "./messages";
import { Tag } from "./processes";

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
  query GetOutgoingTransactions ($owner: String!, $cursor: String) {
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
  query GetIncomingTransactions ($recipient: String!, $cursor: String) {
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

export interface Block {
  nonce: string;
  previous_block: string;
  timestamp: number;
  last_retarget: number;
  diff: number;
  height: number;
  hash: string;
  indep_hash: string;
  txs: string[];
  tx_root: string;
  tx_tree: string[];
  wallet_list: string;
  reward: string;
  reward_addr: string;
  tags: Tag[];
  reward_pool: string;
  weave_size: number;
  block_size: string;
  cumulative_diff: number;
  hash_list_merkle: string;
  poa: {
    option: number;
    tx_path: string;
    data_path: string;
    chunk: string;
  };
}

export const GetTransactionsForBlock: TypedDocumentNode<FullTransactionNodeQueryType, { block: number; cursor?: string }> = gql`
  query GetTransactionsForBlock ($block: Int, $cursor: String) {
    transactions(
      block: {
        min: $block
        max: $block
      }
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
