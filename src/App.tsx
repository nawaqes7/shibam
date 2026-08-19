import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminArticles = lazy(() => import("./pages/AdminArticles"));
const AdminAddArticle = lazy(() => import("./pages/AdminAddArticle"));
const AdminSources = lazy(() => import("./pages/AdminSources"));
const AdminAiTools = lazy(() => import("./pages/AdminAiTools"));
const AdminTrending = lazy(() => import("./pages/AdminTrending"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminRadio = lazy(() => import("./pages/AdminRadio"));
import AdminQuickAccess from "./components/AdminQuickAccess";
import ArticlePage from "./pages/ArticlePage";
import NewsArchive from "./pages/NewsArchive";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = sessionStorage.getItem("alqiada24_admin") === "true";
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
  <HelmetProvider>
      <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-sm font-bold text-muted-foreground">جاري تحميل الصفحة…</div>}>
      <Toaster />
      <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AdminQuickAccess />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/archive" element={<NewsArchive />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="articles" element={<AdminArticles />} />
            <Route path="add-article" element={<AdminAddArticle />} />
            <Route path="sources" element={<AdminSources />} />
            <Route path="ai-tools" element={<AdminAiTools />} />
            <Route path="trending" element={<AdminTrending />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="radio" element={<AdminRadio />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </Suspense>
      </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;
