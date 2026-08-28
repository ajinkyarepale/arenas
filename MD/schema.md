You are working on the existing Arena project, a prediction-market-style event platform.

I want you to analyze the ENTIRE existing project first — frontend, backend, routes, APIs, database models/schema, authentication, organizer controls, participant flows, rounds, predictions, points, graphs, and any other existing modules.

Do NOT blindly create a new schema from scratch. Understand the current architecture and then design/refactor the database and authorization schema so it can properly support the complete application.

## PRIMARY OBJECTIVE

Design a robust, scalable database schema and security/authorization model for Arena.

The system must support:

1. SuperAdmin
2. Admin
3. Organizer
4. Participant/User

The important distinction is:

* SuperAdmin → unrestricted access to the entire Arena system
* Admin → limited administrative access based on explicitly assigned permissions
* Organizer → manages their own event/arena/rounds and settings, but cannot access global system administration
* Participant → can only interact with arenas/rounds they are allowed to participate in

Do NOT implement authorization simply as:

`if user.role === "admin"`

Use a proper role + permission model wherever appropriate.

---

# 1. USER / AUTHENTICATION SCHEMA

Design the user/account schema required for:

* unique user identity
* authentication
* account status
* profile information
* role assignment
* timestamps
* last login/activity where useful
* account suspension/deactivation
* secure password/authentication handling if authentication is handled by the application

Avoid storing sensitive authentication information unnecessarily.

Consider:

* users
* roles
* permissions
* user_roles
* role_permissions

If the current project already has an authentication system, integrate with it rather than replacing it unnecessarily.

---

# 2. RBAC — ROLE BASED ACCESS CONTROL

Create a proper RBAC architecture.

Minimum roles:

### SUPERADMIN

Full access to everything.

Can:

* manage all users
* create/delete/modify admins
* assign admin permissions
* manage organizers
* view all arenas/events
* modify system settings
* view all financial/point-related information
* access all rounds
* access all analytics
* access audit logs
* override system settings
* suspend users
* perform emergency actions

SuperAdmin should bypass normal permission restrictions.

### ADMIN

Admin access must NOT automatically mean full access.

Admins should receive granular permissions.

Examples:

* USER_VIEW
* USER_CREATE
* USER_UPDATE
* USER_SUSPEND
* ORGANIZER_VIEW
* ORGANIZER_MANAGE
* ARENA_VIEW
* ARENA_MANAGE
* ROUND_VIEW
* ROUND_MANAGE
* PARTICIPANT_VIEW
* ANALYTICS_VIEW
* AUDIT_LOG_VIEW
* SYSTEM_SETTINGS_VIEW
* SYSTEM_SETTINGS_UPDATE

Design the schema so new permissions can easily be added later.

An Admin should only be able to perform an action if:

`user -> role -> permission -> resource/action`

allows it.

### ORGANIZER

Organizer permissions should be scoped to resources they own/manage.

For example:

Organizer A should NOT be able to modify Organizer B's arena.

Organizer should be able to:

* create/manage their arena
* configure rounds
* configure prediction settings
* configure participant submission rules
* start/end rounds
* view participant activity
* view graphs
* view round analytics
* manage relevant event settings

But Organizer should NOT:

* manage global users
* create SuperAdmins
* modify other organizers' arenas
* modify global system configuration
* access unrestricted audit logs

### PARTICIPANT

Participants should have the minimum permissions necessary.

They can:

* join an arena
* view allowed arena information
* view active rounds
* submit predictions when submissions are open
* view permitted graphs/statistics
* view their own points
* view their own prediction history
* view leaderboard information if enabled

Participants should NOT be able to:

* modify rounds
* modify market configuration
* modify other users
* access organizer controls
* access admin controls
* manipulate points
* modify prediction results

---

# 3. PERMISSION MODEL

Create a centralized permissions model.

Each permission should represent an action, for example:

`resource + action`

Examples:

* USER:READ
* USER:CREATE
* USER:UPDATE
* USER:SUSPEND
* ARENA:READ
* ARENA:CREATE
* ARENA:UPDATE
* ARENA:DELETE
* ROUND:READ
* ROUND:CREATE
* ROUND:UPDATE
* ROUND:START
* ROUND:END
* PREDICTION:READ
* PREDICTION:CREATE
* PREDICTION:UPDATE
* PARTICIPANT:READ
* ANALYTICS:READ
* AUDIT_LOG:READ
* SETTINGS:READ
* SETTINGS:UPDATE

Do not hard-code permission logic throughout the application.

Create a reusable authorization layer/middleware/service.

---

# 4. RESOURCE-LEVEL AUTHORIZATION

RBAC alone is not enough.

Implement resource ownership/scoping.

Example:

Admin:
Can access resources according to assigned permissions.

Organizer:
Can access only arenas/events that belong to them.

Participant:
Can access only arenas/rounds they have joined or are authorized to view.

The authorization system should therefore support:

* role-level permissions
* permission-level access
* ownership
* resource scope

Conceptually:

`Authentication → Role → Permission → Resource Scope → Action`

---

# 5. ARENA / EVENT SCHEMA

Analyze the existing Arena structure and create a clean schema for the actual event.

Potential entities:

* Arena/Event
* Organizer
* Participants
* Arena membership
* Arena settings
* Arena status
* created_by
* timestamps

An Arena should have a clear owner/organizer relationship.

Support lifecycle states such as:

* DRAFT
* READY
* LIVE
* PAUSED
* COMPLETED
* ARCHIVED

Do not duplicate state information unnecessarily.

---

# 6. ROUND SCHEMA

Arena contains multiple rounds.

Design the schema so each round can have its own:

* question
* description
* YES/NO prediction configuration
* start time
* end time
* submission status
* point rules
* settlement/result
* graph/statistics data
* participant submission rules

Important requirement from the current Arena design:

The organizer must be able to control whether participants can submit predictions BEFORE the round starts.

Submission configuration should support:

### Unlimited until points run out

Participants can continue submitting as long as they have more than 0 available points.

### Time limited

Participants can submit only until a configured deadline.

Potential fields/concepts:

* submission_mode
* submission_deadline
* minimum_points_required
* max_points_per_prediction if applicable
* max_total_points if applicable
* submission_enabled

Design this flexibly rather than hard-coding only two modes.

---

# 7. PREDICTION / MARKET SCHEMA

Create a normalized structure for predictions.

A prediction should be associated with:

* participant
* arena
* round
* selected outcome
* amount/stake
* timestamp
* status
* settlement result
* points gained/lost where appropriate

Do NOT allow participants to directly modify historical prediction records after submission.

Use immutable prediction/transaction records wherever possible.

If corrections are required, use a correction/reversal mechanism instead of silently editing historical financial/point records.

---

# 8. POINTS / WALLET / LEDGER

Arena currently starts participants with points.

Design a proper point/accounting system.

Avoid relying only on:

`users.points`

for important historical accounting.

Prefer a ledger/transaction model.

For example:

* participant account
* point balance
* point transactions

Transactions may include:

* INITIAL_BALANCE
* PREDICTION_STAKE
* PREDICTION_WIN
* PREDICTION_LOSS
* REFUND
* ADMIN_ADJUSTMENT
* BONUS
* CORRECTION

Every adjustment should have:

* amount
* reason
* actor
* timestamp
* reference to related entity where applicable

Admin/SuperAdmin point adjustments must be auditable.

The system should prevent unauthorized balance manipulation.

---

# 9. GRAPH / ANALYTICS DATA

The participant-facing Arena UI needs to display prediction activity.

For example:

YES vs NO participation should be visible as a graph.

The graph should support switching between:

* Line graph
* Bar graph

The same principle should be usable for other Arena graphs.

Design the underlying data model/API so the frontend can request time-series/statistical data without coupling the database to a specific chart type.

The database should store the underlying facts/data.

The frontend should decide whether to render them as:

* line
* bar
* other supported visualizations

Do NOT store "line graph" or "bar graph" as the fundamental data model.

---

# 10. AUDIT LOGGING

This is extremely important.

Create an audit log system for sensitive actions.

Track things such as:

* user creation
* role changes
* permission changes
* user suspension
* arena creation/deletion
* arena configuration changes
* round creation
* round start/end
* prediction configuration changes
* point adjustments
* administrative overrides
* system setting changes

Audit records should contain, where appropriate:

* actor/user
* action
* resource type
* resource ID
* previous value
* new value
* timestamp
* IP/device metadata if already supported and appropriate

Audit logs should be append-only from the application perspective.

Admins should only see audit logs if they have the appropriate permission.

SuperAdmin can access all audit logs.

---

# 11. ADMIN MANAGEMENT

Create a secure model for managing admins.

SuperAdmin should be able to:

* create admin accounts
* deactivate admins
* assign roles
* assign individual permissions
* revoke permissions
* view admin activity

An Admin must NOT be able to escalate themselves into SuperAdmin.

An Admin must NOT be able to grant themselves permissions they don't possess.

Prevent privilege escalation at the backend/database authorization layer, not merely through UI restrictions.

---

# 12. SECURITY REQUIREMENTS

Review the existing application for security issues while designing this schema.

Pay particular attention to:

* authentication
* authorization
* privilege escalation
* IDOR/BOLA
* insecure direct object access
* unauthorized arena access
* unauthorized round modification
* unauthorized point modification
* participant impersonation
* prediction tampering
* replay/double submission
* race conditions
* duplicate transactions
* client-side authorization
* API authorization
* mass assignment
* sensitive data exposure

NEVER rely on frontend role checks for security.

Every sensitive backend/API operation must independently validate authorization.

---

# 13. DATABASE INTEGRITY

Use:

* foreign keys
* unique constraints
* indexes
* appropriate cascading behavior
* check constraints where supported
* transactions for critical operations

Pay special attention to concurrent prediction submissions and point updates.

A participant must not be able to exploit simultaneous requests to spend more points than they actually have.

Use transactional/atomic operations where necessary.

---

# 14. DATA OWNERSHIP

Clearly define ownership relationships.

For example:

User
↓
Organizer
↓
Arena
↓
Round
↓
Prediction

Make it impossible for an organizer to manipulate another organizer's Arena simply by changing an ID in an API request.

Do not trust IDs received from the frontend.

---

# 15. DATABASE SCHEMA OUTPUT

After analyzing the existing project, produce:

1. Entity relationship diagram / conceptual schema
2. Complete list of entities/tables
3. Fields for each entity
4. Primary keys
5. Foreign keys
6. Unique constraints
7. Important indexes
8. Relationships/cardinality
9. RBAC structure
10. Permission matrix
11. Resource ownership rules
12. Audit logging design
13. Point ledger design
14. Prediction lifecycle
15. Round lifecycle
16. Arena lifecycle

Clearly explain why each major entity exists.

---

# 16. MIGRATION / EXISTING CODE

Do not break the existing Arena application.

First inspect:

* existing database
* existing models
* API routes
* authentication
* authorization
* frontend role handling
* organizer dashboard
* participant dashboard
* round logic
* point logic
* prediction logic

Then determine:

* what can be reused
* what should be modified
* what should be migrated
* what should be deprecated

If the current schema already contains useful entities, evolve them instead of unnecessarily replacing everything.

---

# 17. IMPLEMENTATION

After designing the schema, implement it in the project's existing technology stack.

Do not introduce a completely different database/ORM/framework unless there is a strong technical reason.

Update:

* database schema/migrations
* models
* authorization middleware
* API authorization
* service layer
* relevant frontend permission handling

Keep the architecture modular.

Create a centralized authorization mechanism that can be reused throughout the application.

For example, conceptually:

`can(user, action, resource)`

or an equivalent architecture appropriate for the existing stack.

---

# 18. SECURITY TESTING

Create tests for authorization boundaries.

At minimum test:

* Participant cannot access Organizer APIs
* Participant cannot modify rounds
* Participant cannot modify points
* Organizer cannot access another organizer's Arena
* Organizer cannot modify global settings
* Admin cannot perform permissions they don't have
* Admin cannot create/modify SuperAdmins
* Admin cannot escalate privileges
* SuperAdmin can perform all permitted administrative operations
* Unauthorized users cannot access protected resources
* Direct API requests cannot bypass frontend restrictions
* Concurrent point spending cannot create negative/incorrect balances
* Predictions cannot be modified after the allowed lifecycle stage

---

# IMPORTANT DESIGN PRINCIPLES

Do NOT:

* create fake/mock security
* rely only on frontend hiding buttons
* use a single `isAdmin` boolean
* give every admin unlimited access
* store critical point history only as a mutable balance
* allow organizers to access other organizers' resources
* hard-code authorization separately inside every API route
* couple analytics data to chart presentation
* silently modify historical prediction/point records

DO:

* use RBAC + resource-level authorization
* keep SuperAdmin as the highest privilege
* make Admin permissions granular
* enforce authorization server-side
* use ownership/scoping
* maintain immutable/auditable financial/point history
* use transactions for critical operations
* maintain strong database integrity
* make the system extensible for future roles and permissions

## FINAL DELIVERABLE

Before changing code, show me the proposed architecture/schema and identify any conflicts with the current Arena implementation.

Then implement the approved design in the existing project.

Do not assume the current implementation is correct. Inspect it critically and point out security or schema weaknesses you find.
