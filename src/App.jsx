import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import PageNotFound from './lib/PageNotFound';
import VetaCatalogo from './pages/VetaCatalogo';
import ContratoMantenimiento from './pages/ContratoMantenimiento';
import CarpetaContratos from './pages/CarpetaContratos';
import ControlClimatizacion from './pages/ControlClimatizacion';
import ControlLoxone from './pages/ControlLoxone';
import AdminPanel from './pages/AdminPanel';
import ControlHorario from './pages/ControlHorario.jsx';
import GestionAusencias from './pages/GestionAusencias';
import TechnicianProfile from './pages/TechnicianProfile';
import StelClientes from './pages/StelClientes';
import StelClientosTab from './pages/StelClientosTab';
import ClientScada from './pages/ClientScada';
import ImportEquipment from './pages/ImportEquipment';
import ControlObras from './pages/ControlObras';
import ObraDetail from './pages/ObraDetail';
import PanelEdificios from './pages/PanelEdificios';
import NfcReader from './pages/NfcReader';
import KioskoFichaje from './pages/KioskoFichaje';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => (
  <PageTransition>
    {Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>}
  </PageTransition>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si hay sesión de técnico propio o cliente, no bloquear la app con errores de auth Base44
  const hasTechSession = !!sessionStorage.getItem('technician_email');
  const hasClientSession = !!sessionStorage.getItem('client_id');

  // Handle authentication errors
  // IMPORTANT: Esta app tiene su propio login (técnicos/clientes).
  // Solo los admin usan el login de Base44. No redirigir automáticamente.
  if (authError && !hasTechSession && !hasClientSession) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // Para auth_required y otros errores, simplemente mostrar la app (MenuInicio)
    // Los técnicos y clientes usan su propio sistema de autenticación
  }

  // Render the main app
  return (
    <ErrorBoundary>
    <AnimatePresence mode="wait">
    <Routes location={location} key={location.pathname}>
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
      <Route path="/ControlHorario" element={<LayoutWrapper currentPageName="ControlHorario"><ControlHorario /></LayoutWrapper>} />
      <Route path="/GestionAusencias" element={<LayoutWrapper currentPageName="GestionAusencias"><GestionAusencias /></LayoutWrapper>} />
      <Route path="/TechnicianProfile" element={<LayoutWrapper currentPageName="TechnicianProfile"><TechnicianProfile /></LayoutWrapper>} />
      <Route path="/StelClientes" element={<LayoutWrapper currentPageName="StelClientes"><StelClientes /></LayoutWrapper>} />
      <Route path="/StelClientosTab" element={<LayoutWrapper currentPageName="StelClientosTab"><StelClientosTab /></LayoutWrapper>} />
      <Route path="/ClientScada" element={<LayoutWrapper currentPageName="ClientScada"><ClientScada /></LayoutWrapper>} />
      <Route path="/ImportEquipment" element={<LayoutWrapper currentPageName="ImportEquipment"><ImportEquipment /></LayoutWrapper>} />
      <Route path="/ControlObras" element={<LayoutWrapper currentPageName="ControlObras"><ControlObras /></LayoutWrapper>} />
      <Route path="/ObraDetail" element={<LayoutWrapper currentPageName="ObraDetail"><ObraDetail /></LayoutWrapper>} />
      <Route path="/PanelEdificios" element={<LayoutWrapper currentPageName="PanelEdificios"><PanelEdificios /></LayoutWrapper>} />
      <Route path="/NfcReader" element={<LayoutWrapper currentPageName="NfcReader"><NfcReader /></LayoutWrapper>} />
      <Route path="/KioskoFichaje" element={<PageTransition><KioskoFichaje /></PageTransition>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AnimatePresence>
    </ErrorBoundary>
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
        <SonnerToaster position="top-center" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App