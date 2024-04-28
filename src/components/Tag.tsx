import { styled } from "@linaria/react"

export default function Tag({ name, value }: Props) {
  return (
    <Wrapper>
      <Field>
        {name}
      </Field>
      <Field>
        {value}
      </Field>
    </Wrapper>
  );
}

const Field = styled.div`
  padding: .16rem .25rem;
  font-size: .87rem;
`;

const Wrapper = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: rgba(4, 255, 0, .1);

  ${Field}:first-child {
    background-color: rgba(4, 255, 0, .23);
  }
`;

interface Props {
  name: string;
  value: string;
}

export const TagsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: .4rem;
  flex-wrap: wrap;
`;
