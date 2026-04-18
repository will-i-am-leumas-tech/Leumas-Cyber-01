import { useEffect, useState } from "react";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { CaseQueuePage } from "./pages/CaseQueuePage";
import { DashboardPage } from "./pages/DashboardPage";

export default function App(): JSX.Element {
  const [hash, setHash] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onHashChange = (): void => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (hash.startsWith("#/queue")) {
    return <CaseQueuePage />;
  }

  if (hash.startsWith("#/admin")) {
    return <AdminDashboardPage />;
  }

  return <DashboardPage />;
}
