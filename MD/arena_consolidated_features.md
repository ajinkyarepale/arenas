# Arena --- Consolidated Feature Requirements

## Project Context

**Arenas** is a points-based (no real money) live prediction market for
college FinTech events.

-   Stack: Next.js 14 + Prisma/Postgres + Socket.io.
-   `server.ts` runs Next.js, Socket.io, and the round scheduler in one
    process.
-   Each round asks a binary question, such as whether BTCUSDT closes
    above the strike price recorded when the round opens.
-   Trading uses an LMSR (Logarithmic Market Scoring Rule) automated
    market maker.
-   Points are non-withdrawable and have no real-money value.

------------------------------------------------------------------------

# Feature 1 --- Buy / Sell Share

## Objective

Keep the existing points-based buying system. **Do not replace it.**

Participants should have two ways to buy a position:

1.  **By points**
2.  **By shares**

### By points

This is the existing flow:

-   Participant enters a points amount.
-   LMSR calculates how many shares that amount can buy.
-   The UI shows the estimated share quantity and fill information.
-   The existing behavior must remain unchanged.

### By shares

Participants can instead specify the number of shares they want.

-   LMSR calculates the exact points cost/margin required for those
    shares.
-   The quote must be calculated using the existing LMSR functions.
-   Do not hand-roll pricing calculations in the UI.
-   YES and NO should independently show the required margin when
    appropriate.
-   If the requested share quantity costs more than the participant can
    afford, cap the share quantity to the maximum affordable amount
    rather than allowing an overspend or displaying an invalid quote.

### Submission

The API does **not** need a new settlement model just because the UI
supports shares.

-   The selected mode only changes how the participant specifies the
    trade.
-   Resolve the final LMSR quote first.
-   Submit the resolved points cost as the existing `stake`.
-   The server must always re-quote against the authoritative live
    market before settlement.
-   Never trust a client-side quote for settlement.

### UI requirements

Preserve the existing trade-panel pattern:

-   Live YES% and NO% price display.
-   Buy-mode toggle:
    -   **By points**
    -   **By shares**
-   Quick-amount chips.
-   Minimum 44px touch targets.
-   Clearly label client-side quotes as **estimated fill**.
-   Buy button subtext:
    -   Points mode: approximately `N sh`
    -   Shares mode: `margin X pts`

### Core invariants

Use the existing `src/lib/lmsr.ts` functions:

-   `costOfShares`
-   `sharesForBudget`
-   `quoteByBudget`
-   `quoteByShares`
-   `priceYes`
-   `payoutForTrade`

The LMSR module itself should not be modified for this UI feature.

------------------------------------------------------------------------

# Feature 2 --- Participant & Organizer Login Flow

## Participant flow

Keep participant onboarding extremely simple:

**Home Page → Participant Login/Signup → Main/Index Page → Join Arena →
Start Playing**

The participant should not need to interact with organizer-specific
controls during normal login.

## Organizer entry point

On the normal participant signup/login page:

-   Remove the prominent/separate **Organizer** tab.
-   Keep participant signup/login as the primary interface.
-   Add a small text link below the normal form:

**"Are you an organizer?"**

-   The text must be a functional clickable link.

## Organizer form

When the user clicks **"Are you an organizer?"**:

1.  Open the existing organizer-details dialog/form.
2.  Show all required organizer information fields.
3.  Provide a clear **"Submit as Organizer"** action.
4.  Submit the request for Super Admin approval.
5.  Redirect the user to the Arena Home Page.

## Pending organizer state

Immediately after submitting an organizer request:

-   The Arena Home Page should be visible only as a blurred background.
-   Do **not** show the normal sidebar.
-   Do **not** show the normal top bar/navigation.
-   Do not leave normal dashboard controls visible or interactive.
-   Display a prominent **"Request Pending"** message/state over the
    blurred page.
-   The underlying page must effectively be locked until the request is
    approved or rejected.

The pending state should feel like a locked application state, not like
a normal dashboard with a small notification.

------------------------------------------------------------------------

# Feature 3 --- Super Admin Organizer Approval

## Pending request count

When an organizer submits a request:

-   Create a pending organizer-access request.
-   On the **Super Admin page**, display the number of pending organizer
    requests.
-   Use a clear count/badge so the Super Admin immediately knows how
    many requests need attention.

## Organizer request dialog

The Super Admin should be able to open the pending requests.

For each request:

-   Show all submitted organizer details in a dialog.
-   Provide two explicit decisions:
    -   **Yes / Approve**
    -   **No / Reject**

## Approval behavior

### Approve

**Pending Request → Approved → User receives Organizer access**

The organizer can then access and use the normal organizer Arena
home/dashboard.

### Reject

**Pending Request → Rejected → User does not receive Organizer access**

The rejected request should no longer be counted as pending.

## Permission requirement

-   Super Admin is the authority for organizer approval.
-   A normal participant must not receive organizer privileges without
    approval.
-   A normal organizer/admin must not be able to approve their own or
    another user's organizer-access request unless the permission model
    explicitly grants that authority.
-   Organizer privileges must be enforced server-side, not only by
    hiding UI controls.

------------------------------------------------------------------------

# Feature 4 --- Projector / Live Arena Screen Layout

The live Arena screen is intended for a **large-screen projector** and
should prioritize readability from a distance.

Use a clean, information-first layout rather than many competing cards.

## Top bar

The top bar should contain:

-   Arena/event name.
-   Asset information.
-   Join code / relevant round information.
-   Live status.
-   Round indicator.

### Center clock

The **round/trading countdown clock must be placed in the center of the
top bar**.

It should be large and visually prominent because spectators need to see
the remaining trading time immediately.

------------------------------------------------------------------------

## Left side --- Market information

The left side should contain the main market visuals in this order:

### 1. Price chart

-   Large primary live asset-price chart.
-   Example: BTCUSDT.
-   This is the main visual element.

### 2. Implied probability graph

Directly below the price chart:

-   Show YES/NO implied probability movement over the round.
-   Update live as trades occur.
-   Make the probability trend easy to follow from a distance.
-   Preserve the existing live-data behavior.

### 3. Closing-chance percentage

After the implied probability graph, show:

**Chance it closes above the strike (YES)**

and the corresponding:

-   YES percentage
-   NO percentage

This should be clearly readable and visually subordinate to the primary
price chart but still prominent.

------------------------------------------------------------------------

## Right side --- Leaderboard

The right side should primarily be dedicated to the leaderboard.

### Top 10

Display the **Top 10 participants**.

Each row should clearly show:

-   Rank.
-   Participant name.
-   Current score/points.

The leaderboard must update live.

### Top 3 styling

Give the first three positions distinct visual treatments:

-   **1st --- Gold**
-   **2nd --- Silver**
-   **3rd --- Bronze**

Positions 4--10 use the standard leaderboard styling.

The ranking should remain readable on a projector.

------------------------------------------------------------------------

# Projector Layout Summary

``` text
┌───────────────────────────────────────────────────────────────┐
│ Arena / Round          COUNTDOWN CLOCK           Live / Round │
├───────────────────────────────────┬───────────────────────────┤
│                                   │                           │
│          LIVE PRICE CHART         │        LEADERBOARD        │
│                                   │                           │
│                                   │     🥇 1. Participant     │
│      IMPLIED PROBABILITY           │     🥈 2. Participant     │
│           GRAPH                    │     🥉 3. Participant     │
│                                   │        4. Participant     │
│      YES / NO CLOSING              │        5. Participant     │
│          CHANCE                    │          ...              │
│                                   │       10. Participant     │
└───────────────────────────────────┴───────────────────────────┘
```

The intended visual hierarchy is:

**Price → Probability → Closing Chance → Countdown → Leaderboard**

------------------------------------------------------------------------

# LMSR / Trading Mechanics

The product should explain the market honestly to participants.

## Core mechanics

The market state contains:

-   `qYes`
-   `qNo`

The YES price is:

`priceYes(state, b) = sigmoid((qYes - qNo) / b)`

The resulting value is always between 0 and 1 and is interpreted as the
market's implied probability.

The LMSR also provides:

-   Exact cost to buy a number of shares.
-   Inverse calculation of how many shares a point budget buys.
-   Before/after prices.
-   Average fill price.
-   Winning-share payout.

Winning shares pay **1 point per share**.

Losing shares pay **0**.

A VOID round refunds the stake.

`b` (`liquidityParamB`) is configured per event and controls how
strongly trades move the market price. The worst-case AMM subsidy per
round is:

`b × ln(2)`

This should be disclosed up front.

------------------------------------------------------------------------

# Worked Examples for Onboarding / Pitch Deck

## Example 1 --- 50/50 market

Suppose:

-   YES = 50%
-   NO = 50%
-   A participant spends 10 points on YES.

Because the market starts evenly balanced, the participant receives
shares according to the LMSR curve. The average fill is around the
starting 50% price but is slightly worse than 50% because the
participant's own trade moves the market toward YES.

The important idea is:

**Your purchase changes the price you pay.**

It is not a fixed-price sportsbook-style transaction.

## Example 2 --- Market has already moved

Suppose the crowd has already pushed the market to:

-   YES = 80%
-   NO = 20%

A new participant buying YES is joining the side the crowd already
favors.

Because the LMSR price rises as YES demand accumulates:

-   YES shares are relatively expensive.
-   The participant receives fewer YES shares for the same points than
    they would have received near 50/50.
-   A new YES trade pushes the price further upward.

Buying NO is cheaper because the market currently assigns NO a lower
implied probability.

## Example 3 --- Large stake worsens its own average fill

Suppose a market starts around 50/50.

Compare two YES trades:

-   Participant A spends a small amount.
-   Participant B spends a much larger amount.

Participant B does **not** simply buy all shares at the starting 50%
price.

As more YES shares are purchased:

1.  The LMSR curve moves the YES price upward.
2.  Later shares cost more than earlier shares.
3.  Therefore the participant's average fill price becomes worse as the
    trade gets larger.

This is an intentional property of the automated market maker.

It discourages a participant from moving the market an unlimited amount
at one fixed price and makes liquidity available without requiring a
traditional order book.

------------------------------------------------------------------------

# "This Isn't Gambling" --- Honest Positioning

The product should distinguish itself from gambling without making
claims that go beyond what the system can support.

## Real distinctions

### No real money

-   No cash changes hands.
-   Points are non-withdrawable.
-   Points do not represent a cash balance.
-   There is no monetary payout.

### Repeated performance

Participants should be evaluated across many rounds rather than on one
isolated prediction.

A typical event has around **12 rounds**.

Performance can be evaluated using calibration and accuracy:

-   Was the participant's stated confidence justified?
-   Did their predictions correspond to actual outcomes?
-   How accurate were they across repeated rounds?

The relevant analytics are based on the existing analytics system.

### Transparent pricing

LMSR is deterministic and auditable.

The pricing mechanism:

-   Is defined mathematically.
-   Has transparent inputs.
-   Produces reproducible prices.
-   Has a disclosed worst-case AMM cost.

This is materially different from an opaque house-set betting price.

## Important limitation

Do **not** claim that participants can reliably predict every individual
round.

A single 5-minute crypto candle is close to a random walk. In an
isolated round, there may be no durable predictive edge.

Therefore, the non-gambling argument should rest on the **repeated,
scored, skill-in-aggregate structure across the entire event**, not on
the claim that participants can consistently "beat the market" round by
round.

------------------------------------------------------------------------

# Technical Invariants

These requirements apply to all trading UI work.

1.  **Server is the source of truth.**

    -   Client quotes are estimates only.
    -   Re-quote server-side immediately before settlement.

2.  **Use the existing LMSR implementation.**

    -   Do not duplicate or hand-roll LMSR math in React components or
        API routes.

3.  **Preserve existing API compatibility.**

    -   The current trade endpoint accepts:
        `{ side: 'YES' | 'NO', stake: number }`
    -   In shares mode, resolve the share request to its LMSR points
        cost and submit that cost as `stake`.

4.  **Affordability must be enforced.**

    -   Participant ceiling is the minimum of available balance and
        `Event.maxStakePerTrade`.
    -   Shares-mode requests above the ceiling must be capped to the
        maximum affordable share quantity.

5.  **Touch targets remain ≥44px.**

6.  **Quick-amount chips remain available** so mobile participants do
    not need to type during a live round.

7.  **Live data remains live.**

    -   Socket.io remains the source for live book/round updates.
    -   The UI should visibly react to market changes.

8.  **Permissions must be enforced server-side.**

    -   Hiding organizer controls is not sufficient for access control.
    -   Super Admin approval determines organizer privileges.

9.  **Do not break existing participant flow.**

10. **Do not replace the existing points-based trading flow when adding
    shares mode.**

------------------------------------------------------------------------

# Acceptance Checks

## Trading

-   `npx tsc --noEmit` passes.
-   `npx vitest run src/lib/lmsr.test.ts` continues to pass unchanged
    (40 tests).
-   LMSR implementation is not modified for this UI feature.
-   By-points mode continues to work exactly as before.
-   By-shares mode calculates required margin using the existing LMSR
    functions.
-   If requested shares exceed the affordability ceiling, the UI shows
    the capped margin equal to the ceiling rather than an error or
    uncapped value.
-   Switching between modes changes only the input denomination.
-   Both modes ultimately submit the resolved points cost to the
    existing trade API.
-   Server-side re-quoting remains authoritative.

## Organizer authentication

-   Participant login/signup remains the default flow.
-   The Organizer tab is removed from the primary signup UI.
-   "Are you an organizer?" is visible as a small functional link.
-   Clicking it opens the organizer details dialog.
-   "Submit as Organizer" creates a pending request.
-   Pending organizers see a blurred Arena Home Page with no sidebar or
    top bar.
-   The pending state is non-interactive until the request is resolved.

## Super Admin

-   Super Admin sees the number of pending organizer requests.
-   Opening a request shows all submitted organizer details.
-   Approve/Yes grants organizer access.
-   Reject/No denies organizer access.
-   Resolved requests are removed from the pending count.
-   Organizer permissions cannot be obtained merely by manipulating
    client-side UI.

## Projector screen

-   Price chart is on the left.
-   Implied probability graph is directly below it.
-   Closing-chance percentage is below the probability graph.
-   Countdown clock is centered in the top bar.
-   Leaderboard occupies the right side.
-   Top 10 participants are displayed.
-   1st, 2nd, and 3rd have distinct gold/silver/bronze treatments.
-   The screen remains readable at large/projector scale.
