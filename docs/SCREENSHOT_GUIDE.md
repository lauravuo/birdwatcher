# Agent Protocol: Taking UI Screenshots

**Context**: You (the AI Agent) are responsible for taking ALL UI screenshots.

## 1. Environment Preparation

Before taking any screenshots, you **MUST** ensure the environment is ready.

1.  **Check for running environment**:
    *   Look for a running process of `./scripts/prepare-screenshot-env.sh`.
    *   Check if `http://localhost:5173` is accessible.

2.  **Start Environment (if not running)**:
    *   Run: `./scripts/prepare-screenshot-env.sh`
    *   Wait for "Environment Ready!" message.
    *   **Important**: This script starts the Firebase Emulators, Seeds Data, and starts the Vite Dev Server.

## 2. Playwright MCP Usage

You **MUST** use the `playwright` MCP server tools for all screenshot tasks.

### Core Tools
| Tool | Purpose |
| :--- | :--- |
| `mcp_playwright_browser_navigate` | Go to a URL (e.g., `http://localhost:5173`). |
| `mcp_playwright_browser_evaluate` | Run JS in the browser (CRITICAL for login). |
| `mcp_playwright_browser_take_screenshot` | Capture the screenshot. |
| `mcp_playwright_browser_resize` | Set viewport size. |

### Configuration Constants
*   **Base URL**: `http://localhost:5173`
*   **User**: `owner@example.com`
*   **Password**: `password123`

## 3. Workflow: Capture Screenshots

Follow this EXACT sequence to ensure success.

### Step 1: Initialize Browser
1.  **Navigate** to the app:
    ```json
    { "url": "http://localhost:5173" }
    ```
2.  **Set Viewport** (Default Desktop):
    ```json
    { "width": 1280, "height": 720 }
    ```

### Step 2: Authenticate (Programmatic)
**DO NOT** fill out the login form manually. It can be flaky. Instead, inject the login state directly using the exposed emulator helpers.

1.  **Execute Login Script**:
    Call `mcp_playwright_browser_evaluate` with:
    ```javascript
    async () => {
      // confirm window.signInWithEmail exists (exposed by firebase.ts in emulator mode)
      if (window.signInWithEmail) {
        await window.signInWithEmail(window.auth, 'owner@example.com', 'password123');
        return "Logged in successfully";
      }
      return "Error: window.signInWithEmail not found";
    }
    ```
2.  **Navigate to Target**:
    Navigate explicitly to your target page (e.g., `http://localhost:5173/groups/<GROUP_ID>`).
    *   **Note**: Navigating to `/sightings` directly may redirect to the home page if no group is selected. It is often safer to navigate to the group URL found in the seed logs (e.g., `http://localhost:5173/groups/LM2xzba9z2JbdJFz7G3X`).

### Step 3: Capture
1.  **Wait for Content**:
    Use `mcp_playwright_browser_wait_for` to ensure specific elements (like a sighting card or list) are visible.
2.  **Clean UI (Optional)**:
    If needed, use `mcp_playwright_browser_evaluate` to hide toast messages or debug overlays.
3.  **Take Screenshot**:
    ```json
    {
      "fullPage": true,
      "filename": ".temp/my-screenshot.png",
      "type": "png"
    }
    ```

## 4. Viewport Standards

Unless otherwise specified by the user, capture these viewports:

*   **Desktop**: `1280x720`
*   **Mobile**: `375x667` (iPhone SE equivalent)

## 5. Troubleshooting

*   **"Error: window.signInWithEmail not found"**:
    *   Ensure the environment script was run with `VITE_USE_EMULATOR=true`.
    *   Refresh the page (`mcp_playwright_browser_navigate`) and try again.
*   **White Screen / Loading Forever**:
    *   The dev server might be rebuilding. Wait 5 seconds and reload.
    *   Check terminal output for build errors.
*   **Auth Error**:
    *   Restart `./scripts/prepare-screenshot-env.sh` to reset the emulator state.
*   **"Opening in existing browser session"**:
    *   This means a Chrome process is locking the user data directory.
    *   Run `pkill -f "Google Chrome"` (macOS) to kill conflicting processes.
    *   Retry the MCP browser launch.

