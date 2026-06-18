import React, { createContext, useContext } from "react";

export const BrandingContext = createContext({
  brandName: "WhaTicket",
  brandLogo: "",
  brandLogoFit: "contain",
  brandLogoPositionX: "50",
  brandLogoPositionY: "50",
  brandLogoScale: "1",
  primaryColor: "#2576d2",
  secondaryColor: "#f50057"
});

export const BrandingProvider = ({ value, children }) => (
  <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
);

export const useBranding = () => useContext(BrandingContext);
