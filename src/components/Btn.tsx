import { styled } from "@linaria/react";

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: .3rem;
  outline: none;
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 8px;
  font-size: 1rem;
  text-align: center;
  cursor: pointer;
  color: #fff;
  padding: .73rem 1.65rem;
  font-size: .9rem;
  width: max-content;
  transition: all .17s ease-in-out;

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  &:hover {
    background-color: rgba(255, 255, 255, .03);
  }
`;

export default Button;
