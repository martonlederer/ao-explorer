import { styled } from "@linaria/react";
import useInfo from "../hooks/useInfo";
import { useMemo } from "react";
import { Quantity } from "ao-tokens-lite";
import { TokenIcon, TokenTicker } from "../pages/process";
import useGateway from "../hooks/useGateway";
import { useInView } from "react-intersection-observer";
import { Link } from "wouter";

export default function TransferAmount({ token, quantity: rawQuantity, direction }: Props) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px"
  });

  const { data: info } = useInfo(token, inView);

  const quantity = useMemo(
    () => new Quantity(rawQuantity, BigInt(info?.Tags?.Denomination || 12)),
    [rawQuantity, info]
  );

  const displayQuantity = useMemo(
    () => {
      let maximumFractionDigits: BigIntToLocaleStringOptions["maximumFractionDigits"] = 2;

      if (Quantity.lt(quantity, new Quantity(0, quantity.denomination).fromString("0.01"))) {
        maximumFractionDigits = Number(quantity.denomination) as BigIntToLocaleStringOptions["maximumFractionDigits"];
      }

      if (quantity.denomination > 8 && Quantity.lt(quantity, new Quantity(0, quantity.denomination).fromString("0." + "0".repeat(7) + "1"))) {
        return "0." + "0".repeat(7) + "1 >";
      }

      return quantity.toLocaleString(undefined, { maximumFractionDigits });
    },
    [quantity, direction]
  );

  const gateway = useGateway();

  return (
    <Link to={`#/${token}`}>
      <Amount direction={direction} ref={ref}>
        {direction === "out" ? "-" : "+"}
        {displayQuantity}
      </Amount>
      {info && (
        <TokenTicker>
          <TokenIcon src={`${gateway}/${info.Tags.Logo}`} draggable={false} />
          {info.Tags.Ticker || info.Tags.Name}
        </TokenTicker>
      )}
    </Link>
  );
}

const Amount = styled.span<{ direction: "in" | "out" }>`
  color: ${props => props.direction === "out" ? "#ff0000" : "#00db5f"};
`;

interface Props {
  token: string;
  quantity: string;
  direction: "in" | "out";
}
