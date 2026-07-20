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
const UserProfiles = lazy(() => import("../pages/UserProfiles"));
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
                  <Route exact path="/" component={Dashboard} isPrivate requiredAnyPermissions={["dashboard.view"]} />
                  <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate requiredAnyPermissions={["tickets.view"]} />
                  <Route exact path="/connections" component={Connections} isPrivate requiredAnyPermissions={["connections.view"]} />
                  <Route exact path="/contacts" component={Contacts} isPrivate requiredAnyPermissions={["contacts.view"]} />
                  <Route exact path="/users" component={Users} isPrivate requiredAnyPermissions={["users.view"]} />
                  <Route exact path="/profiles" component={UserProfiles} isPrivate requiredAnyPermissions={["profiles.manage"]} />
                  <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate requiredAnyPermissions={["quickAnswers.view"]} />
                  <Route
                    exact
                    path="/settings"
                    component={Settings}
                    isPrivate
                    requiredAnyPermissions={[
                      "settings.view",
                      "settings.manage",
                      "settings.categories",
                      "settings.categories.view",
                      "settings.closing_reasons",
                      "settings.closing_reasons.view",
                      "settings.satisfaction",
                      "settings.satisfaction.view",
                      "settings.audit_logs",
                      "settings.ura",
                      "settings.ura_flows",
                      "settings.ura_options",
                      "settings.forms",
                      "settings.form_builder",
                      "settings.form_responses",
                      "settings.form_reports",
                      "settings.ai",
                      "settings.ai_agents",
                      "settings.knowledge_base",
                      "settings.ai_contexts",
                      "settings.ai_leads",
                      "settings.ai_tools",
                      "settings.ai_calendar",
                      "tags.view"
                    ]}
                    requiredAnySpecialPermissions={["accessUra", "accessForms", "accessAi"]}
                  />
                  <Route exact path="/integrations" component={Integrations} isPrivate requiredAnyPermissions={["integrations.view", "glpi.view", "whatsapp_provider.view"]} />
                  <Route exact path="/queues" component={Queues} isPrivate requiredAnyPermissions={["queues.view"]} />
                  <Route exact path="/campaigns-schedules" component={CampaignsSchedules} isPrivate requiredAnyPermissions={["campaigns.view", "scheduledMessages.view"]} />
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

