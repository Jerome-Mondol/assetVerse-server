TODO — AssetVerse (client + server)

Summary: reviewed current client and server folders. Below are missing items and concrete tasks to reach the assignment spec. Tasks are grouped by priority.

PRIORITY — MUST HAVE (needed for assignment correctness)

Server (src)
- Authentication
  - Add password handling (bcrypt) and validate credentials on login (`src/routes/auth.routes.js`) — currently register/login use only email.
  - Add token expiry in `src/utils/jwt.js` (set `expiresIn`).
- Requests approval rules
  - In `src/routes/requests.routes.js` (accept endpoint):
    - verify approving HR matches request.hrEmail
    - ensure `asset.availableQuantity > 0` before approving
    - enforce `hr.currentEmployees < hr.packageLimit` before approving
    - scope affiliation by `{ employeeEmail, hrEmail }` not just employeeEmail
    - increment `hr.currentEmployees` only when a new affiliation is created
- Affiliations
  - `src/routes/affiliations.routes.js` remove handler fixed for basic flow but verify behavior in edge cases (multiple companies, many assigned assets). Unit tests recommended.
- Asset return flow
  - Add endpoint to return assigned assets: mark assignedAssets.status='returned', set returnDate, increment `assets.availableQuantity` (`new file`: `src/routes/assignedAssets.routes.js` or add to `assets.routes.js`).
- Direct assignment (HR)
  - Add endpoint allowing HR to assign asset to already-affiliated employee (validate affiliation and asset availability).
- Pagination
  - Add server-side pagination to `assets` listing and `affiliations`/employee lists (`?page=&limit=` with defaults 10).
- Input validation
  - Add `ObjectId.isValid` checks on all id query/params across routes. Ensure routes return after sending response.

Server (nice-to-have but required by spec)
- Stripe/payment endpoints and Payments collection (you said skip for now).
- Analytics endpoints (counts, top requested assets) to power charts.

Client (client/src)
- Auth flows
  - Login, HR and Employee register components exist, but client must send password and handle token storage (check `src/config/axios.js` and `src/context/AuthContext.jsx` for token usage). Implement persistent auth (localStorage) on reload.
  - Google social login not implemented (optional).
- HR dashboards
  - Asset List page exists (`hrPages/AssetList.jsx`) — verify it supports search, edit, delete and pagination.
  - Add Asset page exists (`AddAsset.jsx`) — ensure it uploads image (ImgBB/Cloudinary) and posts required fields.
  - All Requests page exists (`AllRequests.jsx`) — ensure approve/reject actions call correct endpoints and UI reflects package limit errors.
  - All Employees (`AllEmployees.jsx`) — should call `affiliations` endpoint and show X/Y count; implement Remove button to call `affiliations/remove` with confirmation.
  - Upgrade Package UI exists? Not present — needs implementation (Stripe skipped for now: UI can show packages and call a mock endpoint or route to upgrade).
- Employee dashboards
  - MyAssets (`MyAssets.jsx`) exists — add Return button for returnable items and call server return endpoint.
  - Request Asset (`RequestAsset.jsx`) exists — ensure it shows only assets with `availableQuantity > 0` and modal note field works.
  - My Team page not present as separate file; ensure `AllEmployees` or team UI exists for employees.
- UI requirements
  - Check DaisyUI usage across components; ensure no other UI frameworks used.
  - Responsive checks: test mobile/tablet layouts.
- Pagination on lists
  - Implement front-end controls wired to server pagination for assets and employee lists.
- Charts
  - Analytics components (Recharts) not present — implement Pie and Bar charts using API endpoints.
- README, commits, deployment
  - Ensure client and server README.md files include required fields (env vars, live URL, packages used).
  - Confirm commit counts (20 client, 12 server) — cannot be verified here; ensure you have that history.

ENVIRONMENT / CONFIG
- Ensure `.env` includes: MONGO_URI, JWT_SECRET, PORT, (STRIPE_SECRET if later), FIREBASE config keys (if using social login).
- `src/config/db.js` throws if MONGO_URI missing — add docs in README.

TEST CASES TO RUN MANUALLY
- HR register -> add asset -> employee request -> HR approve -> check affiliation created and assignedAssets inserted and availableQuantity decremented.
- When hr.packageLimit reached, approve should fail with clear error.
- Employee returns returnable asset -> assignedAssets.status updated and assets.availableQuantity incremented.
- HR removes employee -> affiliation status inactive and assigned assets marked returned and hr.currentEmployees decremented safely.

FILES I SUGGEST EDITING (server)
- `src/routes/auth.routes.js` (improve login/register flows)
- `src/utils/jwt.js` (add expiresIn)
- `src/routes/requests.routes.js` (accept endpoint fixes)
- `src/routes/affiliations.routes.js` (already updated; review)
- `src/routes/assets.routes.js` (add return/assign endpoints, pagination)
- `src/routes/assignedAssets.routes.js` (new: list/return endpoints)
- `src/routes/packages.routes.js` (new: list packages)

FILES TO CHECK (client)
- `client/src/context/AuthContext.jsx` (token persistence, user info)
- `client/src/config/axios.js` (attach token headers)
- `client/src/pages/hrPages/AllRequests.jsx` (approve/reject flows)
- `client/src/pages/hrPages/AllEmployees.jsx` (remove employee flow)
- `client/src/pages/employeePages/RequestAsset.jsx` (request flow)
- `client/src/pages/employeePages/MyAssets.jsx` (return flow)

NEXT STEP
- I can implement one server change now (priority suggestion: fix `requests.routes.js` accept endpoint to enforce package limit and ownership). Tell me to start that or pick another task.

Notes
- I intentionally left Stripe and password hashing out (per your request) but kept notes where they belong later.
- After you pick a task I will implement incrementally and run minimal checks.
