import React from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard/";
import Tickets from "../pages/Tickets/";
import Signup from "../pages/Signup/";
import Login from "../pages/Login/";
import Connections from "../pages/Connections/";
import Settings from "../pages/Settings/";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts/";
import QuickAnswers from "../pages/QuickAnswers/";
import Queues from "../pages/Queues/";
import CampaignsSchedules from "../pages/CampaignsSchedules/";
import Integrations from "../pages/Integrations/";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import Route from "./Route";

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
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
          <ToastContainer autoClose={3000} />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;

