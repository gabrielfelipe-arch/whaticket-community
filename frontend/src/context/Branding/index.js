import React, { createContext, useContext } from "react";

export const DEFAULT_BRAND_NAME = "Rocket Service";

export const normalizeBrandName = value => {
  const brandName = String(value || "").trim();
  if (!brandName || brandName.toLowerCase() === "whaticket") {
    return DEFAULT_BRAND_NAME;
  }

  return brandName;
};

export const defaultBranding = {
  brandName: DEFAULT_BRAND_NAME,
  brandLogo: "",
  brandLogoFit: "contain",
  brandLogoPositionX: "50",
  brandLogoPositionY: "50",
  brandLogoScale: "1",
  primaryColor: "#2576d2",
  secondaryColor: "#f50057",
  companyFantasyName: "",
  companyLegalName: "",
  companyCnpj: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: ""
};

export const normalizeBranding = value => ({
  ...defaultBranding,
  ...(value || {}),
  brandName: normalizeBrandName(value?.brandName)
});

export const BrandingContext = createContext(defaultBranding);

export const BrandingProvider = ({ value, children }) => (
  <BrandingContext.Provider value={normalizeBranding(value)}>{children}</BrandingContext.Provider>
);

export const useBranding = () => useContext(BrandingContext);
