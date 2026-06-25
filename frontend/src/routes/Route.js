import React, { useContext } from "react";
import { Route as RouterRoute, Redirect } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";

const Route = ({ component: Component, isPrivate = false, requiredProfile, requiredAnySpecialPermissions = [], ...rest }) => {
  const { isAuth, loading, user } = useContext(AuthContext);

  if (!isAuth && isPrivate) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />
      </>
    );
  }

  if (isAuth && !isPrivate) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/", state: { from: rest.location } }} />;
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

  if (isAuth && allowedProfiles.length && !allowedProfiles.includes(user?.profile) && !hasSpecialPermission) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/", state: { from: rest.location } }} />
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
