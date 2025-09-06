import { TypedDocumentNode, gql } from "@apollo/client";
import { GetMessageType } from "./messages";

export const GetTransaction: TypedDocumentNode<GetMessageType, { id: string }> = gql`
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
        }
      }
    }
  }
`;
