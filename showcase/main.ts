// The showcase: every component of the kit in every state (plans/PLAN.md,
// "Showcase"). It grows with each milestone; K3 gives it its design.

import { isMessage } from '../src/core/message';

const status = document.getElementById('status');
if (status) status.textContent = isMessage({ code: 'kit.ready' }) ? 'Components arrive with the milestones.' : '';
