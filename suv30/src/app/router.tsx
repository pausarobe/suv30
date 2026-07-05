import { createBrowserRouter } from "react-router-dom";

import DashboardPage from "@/pages/Dashboard/DashboardPage";
import MarketPage from "@/pages/Market/MarketPage";
import SettingsPage from "@/pages/Settings/SettingsPage";
import MainLayout from "@/layouts/MainLayout";
import ModelsPage from "@/pages/Models/ModelsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "models",
        element: <ModelsPage />,
      },
      {
        path: "market",
        element: <MarketPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);