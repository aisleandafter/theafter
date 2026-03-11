import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ProfileSetup from "./pages/ProfileSetup";
import DiscoverPage from "./pages/DiscoverPage";
import MatchesPage from "./pages/MatchesPage";
import ChatPage from "./pages/ChatPage";
import AdminDashboard from "./pages/AdminDashboard";
import CountdownPage from "./pages/CountdownPage";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

const ProfileRequired = ({ children }) => {
  const { user } = useAuth();
  
  if (user && !user.profile_complete && !user.is_host) {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return children;
};

const EventRequired = ({ children }) => {
  const { user } = useAuth();
  
  if (user && !user.event_id) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  
  // Determine where to redirect authenticated users
  const getAuthRedirect = () => {
    if (!user) return null;
    if (user.is_host) return "/admin";
    if (!user.event_id) return "/";
    if (!user.profile_complete) return "/profile-setup";
    return "/discover";
  };
  
  const authRedirect = getAuthRedirect();
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/countdown/:eventCode" element={<CountdownPage />} />
      <Route path="/auth" element={user ? <Navigate to={authRedirect} replace /> : <AuthPage />} />
      <Route 
        path="/profile-setup" 
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/discover" 
        element={
          <ProtectedRoute>
            <EventRequired>
              <ProfileRequired>
                <DiscoverPage />
              </ProfileRequired>
            </EventRequired>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/matches" 
        element={
          <ProtectedRoute>
            <EventRequired>
              <ProfileRequired>
                <MatchesPage />
              </ProfileRequired>
            </EventRequired>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chat/:matchId" 
        element={
          <ProtectedRoute>
            <EventRequired>
              <ProfileRequired>
                <ChatPage />
              </ProfileRequired>
            </EventRequired>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="app-container paper-texture">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
