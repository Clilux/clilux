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
import Home from './pages/Home';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import ClientDetail from './pages/ClientDetail';
import BuildingForm from './pages/BuildingForm';
import BuildingDetail from './pages/BuildingDetail';
import EquipmentForm from './pages/EquipmentForm';
import EquipmentDetail from './pages/EquipmentDetail';
import RevisionForm from './pages/RevisionForm';
import RevisionDetail from './pages/RevisionDetail';
import Revisions from './pages/Revisions';
import Buildings from './pages/Buildings';
import Settings from './pages/Settings';
import Incidents from './pages/Incidents';
import IncidentForm from './pages/IncidentForm';
import IncidentDetail from './pages/IncidentDetail';
import Calendar from './pages/Calendar';
import RevisionFieldSettings from './pages/RevisionFieldSettings';


export const PAGES = {
    "Home": Home,
    "Clients": Clients,
    "ClientForm": ClientForm,
    "ClientDetail": ClientDetail,
    "BuildingForm": BuildingForm,
    "BuildingDetail": BuildingDetail,
    "EquipmentForm": EquipmentForm,
    "EquipmentDetail": EquipmentDetail,
    "RevisionForm": RevisionForm,
    "RevisionDetail": RevisionDetail,
    "Revisions": Revisions,
    "Buildings": Buildings,
    "Settings": Settings,
    "Incidents": Incidents,
    "IncidentForm": IncidentForm,
    "IncidentDetail": IncidentDetail,
    "Calendar": Calendar,
    "RevisionFieldSettings": RevisionFieldSettings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};