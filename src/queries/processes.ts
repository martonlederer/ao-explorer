import { gql, TypedDocumentNode } from "@apollo/client";

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
        { name: "Data-Protocol", values: ["ao"]}
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
        { name: "Data-Protocol", values: ["ao"]}
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
        { name: "Data-Protocol", values: ["ao"]}
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
