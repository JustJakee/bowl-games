// ROUTING — SCROLL RESTORATION — REACT ROUTER
import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") {
      // Back and forward navigation retain the browser history entry's native scroll position.
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [location.pathname, navigationType]);

  return null;
};

export default ScrollToTop;
