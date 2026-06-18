import { useEffect, useState } from "react";
import { formatCountdown } from "../utils/countdown";

const useCountdown = (target) => {
  const [label, setLabel] = useState(() => formatCountdown(target));

  useEffect(() => {
    setLabel(formatCountdown(target));
    const id = window.setInterval(() => {
      setLabel(formatCountdown(target));
    }, 60_000);

    return () => {
      window.clearInterval(id);
    };
  }, [target]);

  return label;
};

export default useCountdown;
