export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("rocketservice:update-available"));
          }
        });
      });
    } catch (err) {
      // PWA support must never block the main application.
    }
  });
};

export const applyServiceWorkerUpdate = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) return;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
};
