import React, { useContext } from "react";
import { Route as RouterRoute, Redirect } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { getDefaultRoute } from "./defaultRoute";

const Route = ({
  component: Component,
  isPrivate = false,
  requiredProfile,
  requiredAnySpecialPermissions = [],
  requiredAnyPermissions = [],
  ...rest
}) => {
  const { isAuth, loading, user } = useContext(AuthContext);
  const defaultRoute = getDefaultRoute(user);

  if (!isAuth && isPrivate) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />
      </>
    );
  }

  if (isAuth && !isPrivate && !(user?.mustChangePassword && rest.path === "/login")) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: defaultRoute, state: { from: rest.location } }} />;
      </>
    );
  }

  if (isAuth && isPrivate && user?.mustChangePassword) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />
      </>
    );
  }

  const allowedProfiles = Array.isArray(requiredProfile)
    ? requiredProfile
    : requiredProfile
      ? [requiredProfile]
      : [];

  const hasSpecialPermission = requiredAnySpecialPermissions.some(permission =>
    user?.specialPermissions?.[permission] === true
  );
  const hasProfilePermission = requiredAnyPermissions.some(permission =>
    user?.permissions?.[permission] === true
  );

  if (
    isAuth &&
    (allowedProfiles.length || requiredAnyPermissions.length) &&
    !allowedProfiles.includes(user?.profile) &&
    !hasSpecialPermission &&
    !hasProfilePermission
  ) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: defaultRoute, state: { from: rest.location } }} />
      </>
    );
  }

  return (
    <>
      {loading && <BackdropLoading />}
      <RouterRoute {...rest} component={Component} />
    </>
  );
};

export default Route;
