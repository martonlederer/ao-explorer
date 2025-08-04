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
      node: {
        id: string;
        tags: Tag[];
        owner: {
          address: string;
        };
        recipient: string;
        block?: Block;
      };
      cursor: string;
    }[];
  };
}

export const GetAllMessages: TypedDocumentNode<GetAllMessagesType, { cursor?: string }> = gql`
  query GetAllMessages ($cursor: String) {
    transactions(
      tags: [
        { name: "Data-Protocol", values: ["ao"]}
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
