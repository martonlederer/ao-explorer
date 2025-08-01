import { ClipboardIcon } from "@iconicicons/react";
import { styled } from "@linaria/react"

export default function Tag({ name, value }: Props) {
  return (
    <Wrapper>
      <Field>
        {name}
        <Copy onClick={() => navigator.clipboard.writeText(name)} />
      </Field>
      <Field>
        {value}
        <Copy onClick={() => navigator.clipboard.writeText(value)} />
      </Field>
    </Wrapper>
  );
}

export const Copy = styled(ClipboardIcon)`
  width: 1em;
  height: 1em;
  color: inherit;
  cursor: pointer;
  transition: all .17s ease-in-out;

  &:hover {
    opacity: .8;
  }

  &:active {
    transform: scale(.9);
  }
`;

const Field = styled.div`
  display: flex;
  align-items: center;
  gap: .23rem;
  padding: .16rem .25rem;
  font-size: .87rem;

  ${Copy} {
    display: none;
  }

  &:hover ${Copy} {
    display: block;
  }
`;

const Wrapper = styled.div`
  display: inline-flex;
  align-items: stretch;
  background-color: rgba(4, 255, 0, .1);

  ${Field}:first-child {
    background-color: rgba(4, 255, 0, .23);
    white-space: nowrap;
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
