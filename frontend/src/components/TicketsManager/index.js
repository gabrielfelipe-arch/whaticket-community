import React, { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import SearchIcon from "@material-ui/icons/Search";
import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import AddIcon from "@material-ui/icons/Add";
import HeadsetMicOutlinedIcon from "@material-ui/icons/HeadsetMicOutlined";
import AccessTimeOutlinedIcon from "@material-ui/icons/AccessTimeOutlined";
import CallSplitIcon from "@material-ui/icons/CallSplit";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";

const useStyles = makeStyles(theme => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    minWidth: 0,
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 0,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: 0,
  },
  header: {
    flex: "none",
    backgroundColor: theme.palette.background.paper,
  },
  primaryNav: {
    display: "flex",
    alignItems: "center",
    height: 40,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  primaryTabs: {
    minHeight: 40,
    height: 40,
    flex: 1,
    minWidth: 0,
    "& .MuiTabs-flexContainer": {
      height: 40,
    },
    "& .MuiTabs-indicator": {
      height: 2,
    },
  },
  primaryTab: {
    minWidth: 0,
    minHeight: 40,
    height: 40,
    padding: theme.spacing(0, 0.75),
    textTransform: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  tabLabel: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  tabIcon: {
    width: 18,
    height: 18,
    flex: "none",
  },
  newTicketButton: {
    width: 40,
    height: 40,
    padding: 0,
    borderRadius: 0,
    color: theme.palette.primary.main,
    borderLeft: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },
  },
  controlsRow: {
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  scopeToggle: {
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    flex: "none",
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    backgroundColor: theme.palette.background.paper,
  },
  scopeButton: {
    minWidth: 54,
    height: 30,
    padding: theme.spacing(0, 1),
    borderRadius: 0,
    textTransform: "none",
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    "& + &": {
      borderLeft: `1px solid ${theme.palette.divider}`,
    },
  },
  scopeButtonActive: {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.type === "dark" ? "rgba(37,99,235,0.18)" : "#EFF6FF",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(37,99,235,0.24)" : "#DBEAFE",
    },
  },
  fixedScope: {
    minWidth: 64,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.type === "dark" ? "rgba(37,99,235,0.18)" : "#EFF6FF",
    fontSize: 12,
    fontWeight: 600,
  },
  searchInputWrapper: {
    flex: 1,
    minWidth: 0,
    height: 32,
    display: "flex",
    alignItems: "center",
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.type === "dark" ? "#111827" : "#F8FAFC",
  },
  searchIcon: {
    width: 17,
    height: 17,
    color: theme.palette.text.secondary,
    margin: theme.spacing(0, 0.75),
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 30,
    fontSize: 12,
    color: theme.palette.text.primary,
  },
  statusNav: {
    height: 40,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  statusTabs: {
    minHeight: 40,
    height: 40,
    "& .MuiTabs-flexContainer": {
      height: 40,
    },
    "& .MuiTabs-indicator": {
      height: 2,
    },
  },
  statusTab: {
    minWidth: 0,
    minHeight: 40,
    height: 40,
    padding: theme.spacing(0, 0.5),
    textTransform: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  statusLabel: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  statusIcon: {
    width: 17,
    height: 17,
    flex: "none",
  },
  countBadge: {
    minWidth: 16,
    height: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    borderRadius: 8,
    backgroundColor: "#22C7E8",
    color: "#082F49",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1,
  },
}));

const TicketsManager = ({ onStartDraft }) => {
  const classes = useStyles();
  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen, setTabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [triageCount, setTriageCount] = useState(0);
  const searchInputRef = useRef();
  const searchTimeoutRef = useRef();
  const { user } = useContext(AuthContext);
  const userQueueIds = user.queues?.map(queue => queue.id) || [];
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds);

  useEffect(() => {
    if (["admin", "supervisor"].includes(user.profile)) {
      setShowAllTickets(true);
    }
  }, [user.profile]);

  useEffect(() => {
    setSelectedQueueIds(previousIds => {
      if (!userQueueIds.length) return [];

      const validIds = previousIds.filter(queueId => userQueueIds.includes(queueId));
      return validIds.length ? validIds : userQueueIds;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(userQueueIds)]);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current?.focus();
      setSearchParam("");
    }
  }, [tab]);

  useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

  const handleSearch = event => {
    const searchedTerm = event.target.value.toLowerCase();
    clearTimeout(searchTimeoutRef.current);

    if (!searchedTerm) {
      setSearchParam("");
      return;
    }

    searchTimeoutRef.current = setTimeout(() => setSearchParam(searchedTerm), 500);
  };

  const applyPanelStyle = status => (
    tabOpen === status ? undefined : { width: 0, height: 0 }
  );

  const primaryLabel = (Icon, label, tooltip) => (
    <Tooltip arrow title={tooltip}>
      <span className={classes.tabLabel}>
        <Icon className={classes.tabIcon} />
        <span>{label}</span>
      </span>
    </Tooltip>
  );

  const statusLabel = (Icon, label, count, tooltip) => (
    <Tooltip arrow title={tooltip}>
      <span className={classes.statusLabel}>
        <Icon className={classes.statusIcon} />
        <span>{label}</span>
        {count > 0 && <span className={classes.countBadge}>{count}</span>}
      </span>
    </Tooltip>
  );

  const scopeSelector = (
    <div className={classes.scopeToggle}>
      <Tooltip arrow title={i18n.t("tickets.tooltips.mine")}>
        <Button
          aria-pressed={!showAllTickets}
          className={clsx(classes.scopeButton, !showAllTickets && classes.scopeButtonActive)}
          onClick={() => setShowAllTickets(false)}
        >
          {i18n.t("tickets.buttons.mine")}
        </Button>
      </Tooltip>
      <Tooltip arrow title={i18n.t("tickets.tooltips.showAll")}>
        <Button
          aria-pressed={showAllTickets}
          className={clsx(classes.scopeButton, showAllTickets && classes.scopeButtonActive)}
          onClick={() => setShowAllTickets(true)}
        >
          {i18n.t("tickets.buttons.showAll")}
        </Button>
      </Tooltip>
    </div>
  );

  return (
    <Paper elevation={0} className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={() => setNewTicketModalOpen(false)}
        onStartDraft={onStartDraft}
      />

      <Paper elevation={0} square className={classes.header}>
        <div className={classes.primaryNav}>
          <Tabs
            value={tab}
            onChange={(event, value) => setTab(value)}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            className={classes.primaryTabs}
            aria-label={i18n.t("tickets.tooltips.navigation")}
          >
            <Tab
              value="open"
              label={primaryLabel(
                QuestionAnswerOutlinedIcon,
                i18n.t("tickets.tabs.open.title"),
                i18n.t("tickets.tabs.open.tooltip")
              )}
              className={classes.primaryTab}
            />
            <Tab
              value="closed"
              label={primaryLabel(
                CheckCircleOutlineIcon,
                i18n.t("tickets.tabs.closed.title"),
                i18n.t("tickets.tabs.closed.tooltip")
              )}
              className={classes.primaryTab}
            />
            <Tab
              value="search"
              label={primaryLabel(
                SearchIcon,
                i18n.t("tickets.tabs.search.title"),
                i18n.t("tickets.tabs.search.tooltip")
              )}
              className={classes.primaryTab}
            />
          </Tabs>
          <Tooltip arrow title={i18n.t("ticketsManager.buttons.newTicketTooltip")}>
            <IconButton
              className={classes.newTicketButton}
              onClick={() => setNewTicketModalOpen(true)}
              aria-label={i18n.t("ticketsManager.buttons.newTicketTooltip")}
            >
              <AddIcon className={classes.tabIcon} />
            </IconButton>
          </Tooltip>
        </div>

        <div className={classes.controlsRow}>
          {tab === "search" ? (
            <div className={classes.searchInputWrapper}>
              <SearchIcon className={classes.searchIcon} />
              <InputBase
                className={classes.searchInput}
                inputRef={searchInputRef}
                placeholder={i18n.t("tickets.search.placeholder")}
                type="search"
                onChange={handleSearch}
              />
            </div>
          ) : (
            <Can
              role={user.profile}
              perform="tickets-manager:showall"
              yes={() => scopeSelector}
              no={() => (
                <Tooltip arrow title={i18n.t("tickets.tooltips.mineFixed")}>
                  <span className={classes.fixedScope}>{i18n.t("tickets.buttons.mine")}</span>
                </Tooltip>
              )}
            />
          )}
          <TicketsQueueSelect
            selectedQueueIds={selectedQueueIds}
            userQueues={user?.queues}
            onChange={setSelectedQueueIds}
          />
        </div>

        {tab === "open" && (
          <div className={classes.statusNav}>
            <Tabs
              value={tabOpen}
              onChange={(event, value) => setTabOpen(value)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              className={classes.statusTabs}
              aria-label={i18n.t("tickets.tooltips.statusNavigation")}
            >
              <Tab
                value="open"
                label={statusLabel(
                  HeadsetMicOutlinedIcon,
                  i18n.t("ticketsList.assignedHeader"),
                  openCount,
                  i18n.t("ticketsList.tooltips.assigned")
                )}
                className={classes.statusTab}
              />
              <Tab
                value="pending"
                label={statusLabel(
                  AccessTimeOutlinedIcon,
                  i18n.t("ticketsList.pendingHeader"),
                  pendingCount,
                  i18n.t("ticketsList.tooltips.pending")
                )}
                className={classes.statusTab}
              />
              <Tab
                value="triage"
                label={statusLabel(
                  CallSplitIcon,
                  i18n.t("ticketsList.triageHeader"),
                  triageCount,
                  i18n.t("ticketsList.tooltips.triage")
                )}
                className={classes.statusTab}
              />
            </Tabs>
          </div>
        )}
      </Paper>

      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <Paper elevation={0} className={classes.ticketsWrapper}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={setOpenCount}
            style={applyPanelStyle("open")}
          />
          <TicketsList
            status="pending"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={setPendingCount}
            style={applyPanelStyle("pending")}
          />
          <TicketsList
            status="pending"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={setTriageCount}
            style={applyPanelStyle("triage")}
            triageOnly="true"
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={showAllTickets}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>

      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          searchParam={searchParam}
          showAll={showAllTickets}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManager;
