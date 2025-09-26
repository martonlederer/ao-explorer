import { gql, TypedDocumentNode } from "@apollo/client";
import { Block, GetMessageType } from "./messages";
import { Tag } from "../ao/types";

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
        block: Block;
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

interface GetOwnedProcessesType extends GetAllProcessesType {
  transactions: GetAllProcessesType["transactions"] & {
    count: string;
  };
}

export const GetOwnedProcesses: TypedDocumentNode<GetOwnedProcessesType, { owner: string; cursor?: string }> = gql`
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
            timestamp
            height
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
  query GetSchedulerLocation ($id: String!) {
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

export interface GetSpawnedByType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    count: string;
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

export interface GetProcessesForModuleType {
  transactions: {
    pageInfo: {
      hasNextPage: boolean;
    };
    count: string;
    edges: {
      node: {
        id: string;
        tags: Tag[];
        block?: Block;
        owner: {
          address: string;
        };
      };
      cursor: string;
    }[];
  };
}

export const GetProcessesForModule: TypedDocumentNode<GetProcessesForModuleType, { module: string; cursor?: string }> = gql`
  query GetProcessesForModule ($module: String!, $cursor: String) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"] }
        { name: "Type", values: ["Process"] }
        { name: "Module", values: [$module] }
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
          owner {
            address
          }
        }
        cursor
      }
    }
  }
`;
