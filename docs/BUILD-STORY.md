# Blockplay SG — how we built it

Blockplay SG turns Singapore locations into stylised, playable Three.js environments. This guide connects the project's **Agentic Engineering** and **Visual Understanding** work to implementation, references, and reproducible checks.

For a concrete new iteration, see the [Raffles refinement with before/after images](raffles-refinement.md).

Start with the [visual comparisons](visual-understanding.md), then the [engineering example](agentic-engineering.md). The [verification record](evidence/verification.md) separates checks performed for this document from historical reports.

| Evidence | What to inspect |
| --- | --- |
| Reference-informed worlds | Three credited source images beside renders of the current scene geometry, with specific correspondences and limitations. |
| Natural language changes gameplay | The companion proposes an existing destination; game-owned validation applies it and updates the objective. |
| Engineering iteration | Parallel region agents, serialized browser QA, a camera/steering diagnosis and correction, and regression checks; companion import and input fixes provide additional examples. |
| Reproducibility | Commands, reviewed commit, rendering camera settings, reference metadata, and bounded verification results. |

The [independent documentation review](evidence/review-notes.md) records the gaps found and the changes made. The team reports an extended end-of-day deadline on 13 September; verification and commit times remain explicit so readers can distinguish historical reports from current checks.

## Experience and availability

The [public demo URL listed by the project](https://blockplay-sg.qwertz0808.chatgpt.site) is **game-only**, according to the [current project guide](PROJECT-GUIDE.md). AI companions and live Street View are not enabled there. The link could not be independently opened by the web verification tool during this documentation pass; public availability and browser behavior are not verified here.

For the companion example, follow [local setup](PROJECT-GUIDE.md#optional-ai-companions), open Marina 3D, request “take me to the museum,” then “give me something closer.” Observe the objective and minimap. Collect a stamp and change the objective again: existing progress should remain. Runtime requests require the configured backend and credentials; the focused unit checks below require neither.

## Roles and scope

- **Astra:** the team's documented development collaborator for interpreting visual references, writing environment/game code, and iterative verification. See [README](../README.md), [development plan](../PLAN.md), and the linked history in the engineering example. These records support the workflow description; this repository is not a complete transcript of model activity.
- **Luna:** the current companion request interpreter, configured as `gpt-5.6-luna` in [the server](../server/adventure-api.ts). Educational output is assembled from curated, source-linked topics.
- **GPT-Live-1:** the optional speech interface delegates requests to the same application path. Automated voice lifecycle tests are not evidence of physical-microphone quality or publicly deployed voice access.
- **Game code:** owns movement, collision, collection, destination validation, and state changes. There is no evidenced Agents API integration in this feature.

The worlds are authored, compressed interpretations informed by Google Maps Street View references. They are not automatic photogrammetry, surveyed replicas, or a demonstrated arbitrary-location generator. Repeating this workflow elsewhere is a plausible extension, not a capability validated by this evidence set.
