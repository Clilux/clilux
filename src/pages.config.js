/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import BuildingDetail from './pages/BuildingDetail';
import BuildingForm from './pages/BuildingForm';
import Buildings from './pages/Buildings';
import Calendar from './pages/Calendar';
import ClientDetail from './pages/ClientDetail';
import ClientForm from './pages/ClientForm';
import Clients from './pages/Clients';
import EquipmentDetail from './pages/EquipmentDetail';
import EquipmentForm from './pages/EquipmentForm';
import Home from './pages/Home';
import HomeTecnico from './pages/HomeTecnico';
import IncidentDetail from './pages/IncidentDetail';
import IncidentForm from './pages/IncidentForm';
import Incidents from './pages/Incidents';
import MaintenanceDetail from './pages/MaintenanceDetail';
import MaintenanceForm from './pages/MaintenanceForm';
import MenuInicio from './pages/MenuInicio';
import RevisionDetail from './pages/RevisionDetail';
import RevisionFieldSettings from './pages/RevisionFieldSettings';
import RevisionForm from './pages/RevisionForm';
import Revisions from './pages/Revisions';
import Settings from './pages/Settings';
import TechnicianManagement from './pages/TechnicianManagement';
import HomeCliente from './pages/HomeCliente';


export const PAGES = {
    "BuildingDetail": BuildingDetail,
    "BuildingForm": BuildingForm,
    "Buildings": Buildings,
    "Calendar": Calendar,
    "ClientDetail": ClientDetail,
    "ClientForm": ClientForm,
    "Clients": Clients,
    "EquipmentDetail": EquipmentDetail,
    "EquipmentForm": EquipmentForm,
    "Home": Home,
    "HomeTecnico": HomeTecnico,
    "IncidentDetail": IncidentDetail,
    "IncidentForm": IncidentForm,
    "Incidents": Incidents,
    "MaintenanceDetail": MaintenanceDetail,
    "MaintenanceForm": MaintenanceForm,
    "MenuInicio": MenuInicio,
    "RevisionDetail": RevisionDetail,
    "RevisionFieldSettings": RevisionFieldSettings,
    "RevisionForm": RevisionForm,
    "Revisions": Revisions,
    "Settings": Settings,
    "TechnicianManagement": TechnicianManagement,
    "HomeCliente": HomeCliente,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};