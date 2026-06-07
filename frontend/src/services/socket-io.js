import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

function connectToSocket() {
    const token = localStorage.getItem("token");
    const backendUrl = getBackendUrl() || "http://localhost:8085";

    return openSocket(backendUrl, {
      transports: ["websocket", "polling", "flashsocket"],
      query: {
        token: JSON.parse(token),
      },
    });
}

export default connectToSocket;

