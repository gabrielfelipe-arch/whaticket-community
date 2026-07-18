import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";

import App from "./App";
import { registerServiceWorker } from "./pwa";

ReactDOM.render(
	<CssBaseline>
		<App />
	</CssBaseline>,
	document.getElementById("root")
);

registerServiceWorker();

// ReactDOM.render(
// 	<React.StrictMode>
// 		<CssBaseline>
// 			<App />
// 		</CssBaseline>,
//   </React.StrictMode>

// 	document.getElementById("root")
// );
