import { Alert, Snackbar } from "@mui/material";
import { useState } from "react";
import PickForm from "../components/PickForm.jsx";

const PicksPage = () => {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleToastClose = (_event, reason) => {
    if (reason === "clickaway") return;
    setToast((current) => ({ ...current, open: false }));
  };

  return (
    <>
      <PickForm
        onSubmitResult={(result) => {
          if (!result) return;
          setToast({ open: true, ...result });
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
