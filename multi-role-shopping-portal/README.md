# Multi-Role Shopping Portal

A modern, e-commerce web application workspace featuring three primary roles (Admin, Supplier, and User) with dynamic real-time SVG dashboards that synchronize automatically every 2 minutes.

## Features
- **Admin**: Dashboard metrics, user & supplier directory management, and a shopping environment proxy.
- **Supplier**: Shop performance indicators (cancellation count, order volume), inventory stocking tools, order dispatchers, and buyer demographics.
- **User**: Interactive product search, floating shopping carts, checkout forms, and order tracking logs.
- **Auto-Sync HUD**: Periodic 2-minute updates backed by browser local storage.
- **Quick-Switch Sandboxing**: Panel to hot-swap between active accounts instantly during development.

---

## Execution Instructions in Visual Studio Code

### Method 1: Easy F5 Launch (Recommended)
1. Launch **Visual Studio Code**.
2. Click **File -> Open Folder...** and select this directory (`C:\Users\kesha\.gemini\antigravity\scratch\multi-role-shopping-portal`).
3. Press **F5** (or click the Run and Debug tab, select "Launch in Edge" or "Launch in Chrome", and click the Play icon).
4. VS Code will automatically spin up the background HTTP server and open the application in your browser at `http://localhost:8000`.

### Method 2: Terminal Run
1. Open this folder in VS Code.
2. Open the integrated terminal (`Ctrl + ~` or **Terminal -> New Terminal**).
3. Execute the start script:
   ```bash
   npm start
   ```
4. Open your web browser and navigate to: **[http://localhost:8000](http://localhost:8000)**.
