import AuthShell from "./components/AuthShell.jsx";
import AppRouter from "./app/AppRouter.jsx";

const App = () => {
  return (
    <AuthShell>
      <AppRouter />
    </AuthShell>
  );
};

export default App;
