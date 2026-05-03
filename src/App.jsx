import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import VetaCatalogo from './pages/VetaCatalogo';
import ContratoMantenimiento from './pages/ContratoMantenimiento';
import CarpetaContratos from './pages/CarpetaContratos';
import ControlClimatizacion from './pages/ControlClimatizacion';
import ControlLoxone from './pages/ControlLoxone';
import AdminPanel from './pages/AdminPanel';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/VetaCatalogo" element={<LayoutWrapper currentPageName="VetaCatalogo"><VetaCatalogo /></LayoutWrapper>} />
      <Route path="/ContratoMantenimiento" element={<LayoutWrapper currentPageName="ContratoMantenimiento"><ContratoMantenimiento /></LayoutWrapper>} />
      <Route path="/CarpetaContratos" element={<LayoutWrapper currentPageName="CarpetaContratos"><CarpetaContratos /></LayoutWrapper>} />
      <Route path="/ControlClimatizacion" element={<LayoutWrapper currentPageName="ControlClimatizacion"><ControlClimatizacion /></LayoutWrapper>} />
      <Route path="/ControlLoxone" element={<LayoutWrapper currentPageName="ControlLoxone"><ControlLoxone /></LayoutWrapper>} />
      <Route path="/AdminPanel" element={<LayoutWrapper currentPageName="AdminPanel"><AdminPanel /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App