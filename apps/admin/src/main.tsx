import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "@lydias-essence/ui/theme.css";
import "@lydias-essence/ui/ui.css";
import "./admin.css";
import { ConfirmProvider, ToastProvider } from "@lydias-essence/ui";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./lib/auth";
import { supabase } from "./lib/supabase";
import { Login } from "./pages/Login";
import { NotConfigured, NotFound, RequireAdmin } from "./pages/Status";
import { Dashboard } from "./pages/Dashboard";
import { ProductsList } from "./pages/ProductsList";
import { ProductEditor } from "./pages/ProductEditor";
import { BulkAdd } from "./pages/BulkAdd";
import { MerchPage } from "./pages/MerchPage";
import { AnnouncementPage } from "./pages/AnnouncementPage";
import { BrandPage } from "./pages/BrandPage";
import { ContentPage } from "./pages/ContentPage";
import { Account } from "./pages/Account";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <RequireAdmin>
        <Layout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products", element: <ProductsList /> },
      { path: "products/new", element: <ProductEditor key="new" /> },
      { path: "products/bulk", element: <BulkAdd /> },
      { path: "products/:id", element: <ProductEditor /> },
      { path: "featured/beauty-rules", element: <MerchPage section="beauty_rules" /> },
      { path: "featured/next-favourite", element: <MerchPage section="next_favourite" /> },
      { path: "settings/banner", element: <AnnouncementPage /> },
      { path: "settings/content", element: <ContentPage /> },
      { path: "settings/brand", element: <BrandPage /> },
      { path: "account", element: <Account /> },
      { path: "*", element: <NotFound /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {supabase ? (
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider client={supabase}>
            <RouterProvider router={router} />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    ) : (
      <NotConfigured />
    )}
  </React.StrictMode>
);
