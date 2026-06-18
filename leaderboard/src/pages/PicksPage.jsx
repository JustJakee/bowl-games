import { Alert, Snackbar } from "@mui/material";
import { useState } from "react";
import PickForm from "../components/PickForm.jsx";
import { useAppData } from "../app/AppDataContext.jsx";

const PicksPage = () => {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const { playerPicks, reloadPicks } = useAppData();

  const handleToastClose = (_event, reason) => {
    if (reason === "clickaway") return;
    setToast((current) => ({ ...current, open: false }));
  };

  return (
    <>
      <PickForm
        playerPicks={playerPicks}
        onSubmitResult={(result) => {
          if (!result) return;
          setToast({ open: true, ...result });
          if (result.severity === "success") {
            reloadPicks();
          }
        }}
      />
      <Snackbar
        open={toast.open}
        autoHideDuration={12000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        onClose={handleToastClose}
      >
        <Alert elevation={6} variant="filled" severity={toast.severity} onClose={handleToastClose}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PicksPage;
