import { Alert, Stack, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useScoreboard } from "../context/NCAAFDataContext";
import { isAdminGameManagementEnabled } from "../utils/adminGameManagement";
import Panel from "../components/common/Panel";
const AdminGamesPage=()=>{const {role}=useAuth();const {season}=useScoreboard();const isAdmin=role==="admin";if(!isAdmin||!isAdminGameManagementEnabled(season))return <Navigate to="/admin/entries" replace/>;return <Stack spacing={2}><Typography variant="h3">Games (Test Season)</Typography><Typography color="text.secondary">Edit game details for the selected test season.</Typography><Panel><Alert severity="info">Game management controls will be added in the next targeted admin workflow.</Alert></Panel></Stack>;};export default AdminGamesPage;
