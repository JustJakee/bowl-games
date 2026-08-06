import { useEffect, useState } from "react";
import { isSeasonPickLocked } from "../utils/pickWindow";

export const usePickWindowLocked = (picksLockAt, seasonStatus) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const deadline = new Date(picksLockAt || "").getTime();
    setNow(Date.now());

    if (!Number.isFinite(deadline)) {
      return undefined;
    }

    let timeoutId;
    const refreshAtDeadline = () => {
      const remaining = deadline - Date.now();

      if (remaining <= 0) {
        setNow(Date.now());
        return;
      }

      timeoutId = window.setTimeout(
        refreshAtDeadline,
        Math.min(remaining, 2_147_483_647),
      );
    };

    refreshAtDeadline();
    return () => window.clearTimeout(timeoutId);
  }, [picksLockAt]);

  return isSeasonPickLocked({ picksLockAt, seasonStatus, now });
};
