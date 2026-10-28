# Re: Screen Control — Considerations on showstrack vs. Calendar

---

Hi Mathias,

I'm replying here to your last message on Teams. I'm adding Olivier to the thread as I believe it's important for him to have visibility on this topic.

The proposal to use calendarios.puydufou.com to control individual screens by writing to `SaisonToPeriodeToEvenementToStatus` is viable for marking "CERRADO". I don't question that.

However, I'd like to provide some context, as I believe the cost of dropping showstrack would be significant. I understand it may seem more practical to centralise development in an application the team already knows, but it's worth considering what would be lost in the process.

The fundamental difference is that operations through the calendar are entirely manual — every state change requires user intervention — whereas showstrack operates fully automatically, while still allowing manual override when needed, with complete traceability.

Features that showstrack currently covers and that would be left uncovered:

- Automatic state engine that manages screen transitions (SCHEDULED → OPEN → CLOSED) without human intervention. The system is based on lead times — configurable anticipation times per show. For example, if a show starts at 17:00 and its lead time is 30 minutes, the screen automatically switches to "OPEN" at 16:30. Each show's visibility (which shows appear on screens and in what order) is also individually configurable.
- Global emergency alerts that instantly replace all screen content.
- Complete audit trail: user, action, date/time, previous and new values.
- Dedicated LED screen frontend, optimised for TV displays with automatic refresh.
- Operational control panel with real-time metrics and system status.
- Synchronisation with pre-validation of changes before applying them.

Regarding individual screen control, this was already planned in showstrack, pending only a user story to kick it off. The implementation would consist of parameterising URLs by screen group (e.g. `?grupo=EUC-OUT`), where each group represents a zone in the park. Each zone would be assigned a specific delay so the state engine automatically calculates when each group should change state — for instance, entrance screens would show "CLOSED" 10 minutes earlier than screens near the show. Fully automatic, while still allowing real-time manual intervention. With the current architecture, implementing, testing, and deploying this would take roughly 3-4 hours.

In terms of development agility, the showstrack stack (FastAPI, PostgreSQL, Alembic, Vue 3) is designed to respond quickly to changing operational needs — sensorisation, reporting, new business rules — with minimal effort thanks to automated migrations and self-documenting API.

My intention is to put into perspective the scope of what already exists. I won't argue that the proposed solution is simple — it is. But what we're considering is replacing a system that manages logic autonomously with one that requires constant manual intervention. Managing this manually would already be a considerable operational burden, but if we also consider managing state delays per individual zone, the issue is no longer just about workload — manually handling those offsets between zones will inevitably lead to a significant number of errors.

If the operations team is happy to take all of this on, that's great. Although, honestly, I'd be quite surprised if, when the time comes to actually manage it, they don't reconsider.

Best regards
