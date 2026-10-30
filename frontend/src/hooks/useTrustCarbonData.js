import { useEffect, useState } from "react";
import { getTrustCarbonData } from "../services/trustCarbonDataService";

export default function useTrustCarbonData() {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    getTrustCarbonData()
      .then((data) => {
        if (active) setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (active)
          setState({
            data: null,
            loading: false,
            error:
              error.message || "Historical emissions data could not be loaded.",
          });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
