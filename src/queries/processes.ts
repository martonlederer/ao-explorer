import { gql, TypedDocumentNode } from "@apollo/client";
import { Block, GetMessageType } from "./messages";

export interface Tag {
  name: string;
  value: string;
}

interface GetAllProcessesType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    edges: {
      node: {
        id: string;
        tags: Tag[];
        owner: {
          address: string;
        };
      };
      cursor: string;
    }[];
  };
}

export const GetAllProcesses: TypedDocumentNode<GetAllProcessesType, { cursor?: string }> = gql`
  query GetAllProcesses ($cursor: String) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Process"] }
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
        }
        cursor
      }
    }
  }
`;

export const GetOwnedProcesses: TypedDocumentNode<GetAllProcessesType, { owner: string; cursor?: string }> = gql`
  query GetOwnedProcesses ($owner: String!, $cursor: String) {
    transactions(
      owners: [$owner]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Process"] }
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
        }
        cursor
      }
    }
  }
`;

export const GetBookmarkedProcesses: TypedDocumentNode<GetAllProcessesType, { marked: string[] }> = gql`
  query GetBookmarkedProcesses ($marked: [ID!]) {
    transactions(
      ids: $marked
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Process"] }
      ],
      first: 100
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
        }
        cursor
      }
    }
  }
`;

interface GetSchedulerLocationType {
  transactions: {
    edges: {
      node: {
        tags: Tag[];
      };
    }[];
  };
}

export const GetSchedulerLocation: TypedDocumentNode<GetSchedulerLocationType, { id: string }> = gql`
  query GetSchedulerLocation ($id: ID!) {
    transactions(
      owners: [$id]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Scheduler-Location"] }
      ],
      first: 1
    ) {
      edges {
        node {
          tags {
            name
            value
          }
        }
      }
    }
  }
`;

interface GetSpawnedByType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    edges: {
      node: {
        id: string;
        tags: Tag[];
        block?: Block;
      };
      cursor: string;
    }[];
  };
}

export const GetSpawnedBy: TypedDocumentNode<GetSpawnedByType, { process: string; cursor?: string }> = gql`
  query GetSpawnedBy ($process: String!, $cursor: String) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Process"] }
        { name: "From-Process", values: [$process] }
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

export const GetSpawnMessage: TypedDocumentNode<GetMessageType, { id: string }> = gql`
  query GetMessage ($id: ID!) {
    transactions(
      ids: [$id]
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Process"] }
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
