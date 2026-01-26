import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { FloatingFeedbackButton } from "./components/FloatingFeedbackButton";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Messages from "./pages/Messages";
import Opportunities from "./pages/Opportunities";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import LaceHub from "./pages/LaceHub";
import MyHub from "./pages/MyHub";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage/LandingPage";
import { PendingRequests } from "./components/PendingRequests";
import { TooltipProvider } from "./components/ui/tooltip";

const queryClient = new QueryClient();

const AppContent = () => {
  useSessionTimeout();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      {!isLandingPage && <Navigation />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunities"
          element={
            <ProtectedRoute>
              <Opportunities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lace-hub"
          element={
            <ProtectedRoute>
              <LaceHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-hub"
          element={
            <ProtectedRoute>
              <MyHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-requests"
          element={
            <ProtectedRoute>
              <PendingRequests />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isLandingPage && <FloatingFeedbackButton />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
