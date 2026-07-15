import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./index.css"
import { registerServiceWorker } from "./registerServiceWorker.js"
import api from "./services/api.js"
import { attachOfflineInterceptors } from "./offline/offlineApiBridge.js"

attachOfflineInterceptors(api)
registerServiceWorker()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
