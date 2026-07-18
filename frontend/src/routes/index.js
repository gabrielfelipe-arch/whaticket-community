import React, { Suspense, lazy } from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import BackdropLoading from "../components/BackdropLoading";
import PwaStatus from "../components/PwaStatus";
import Route from "./Route";

const Dashboard = lazy(() => import("../pages/Dashboard/"));
const Tickets = lazy(() => import("../pages/Tickets/"));
const Signup = lazy(() => import("../pages/Signup/"));
const Login = lazy(() => import("../pages/Login/"));
const Connections = lazy(() => import("../pages/Connections/"));
const Settings = lazy(() => import("../pages/Settings/"));
const Users = lazy(() => import("../pages/Users"));
const Contacts = lazy(() => import("../pages/Contacts/"));
const QuickAnswers = lazy(() => import("../pages/QuickAnswers/"));
const Queues = lazy(() => import("../pages/Queues/"));
const CampaignsSchedules = lazy(() => import("../pages/CampaignsSchedules/"));
const Integrations = lazy(() => import("../pages/Integrations/"));

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Suspense fallback={<BackdropLoading />}>
            <Switch>
              <Route exact path="/login" component={Login} />
              <Route exact path="/signup" component={Signup} />
              <WhatsAppsProvider>
                <LoggedInLayout>
                  <Route exact path="/" component={Dashboard} isPrivate />
                  <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate />
                  <Route exact path="/connections" component={Connections} isPrivate requiredProfile={["admin", "supervisor"]} />
                  <Route exact path="/contacts" component={Contacts} isPrivate />
                  <Route exact path="/users" component={Users} isPrivate requiredProfile={["admin", "supervisor"]} />
                  <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate />
                  <Route
                    exact
                    path="/settings"
                    component={Settings}
                    isPrivate
                    requiredProfile={["admin", "supervisor"]}
                    requiredAnySpecialPermissions={["accessUra", "accessForms", "accessAi"]}
                  />
                  <Route exact path="/integrations" component={Integrations} isPrivate requiredProfile="admin" />
                  <Route exact path="/queues" component={Queues} isPrivate requiredProfile="admin" />
                  <Route exact path="/campaigns-schedules" component={CampaignsSchedules} isPrivate />
                </LoggedInLayout>
              </WhatsAppsProvider>
            </Switch>
          </Suspense>
          <PwaStatus />
          <ToastContainer autoClose={3000} />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;

