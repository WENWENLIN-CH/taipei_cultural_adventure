// Read-only Phase2 rehearsal preview. No database client and no write path.
import {PHASE2_REHEARSAL,createPhase2DryRunPlan} from "../phase2-rehearsal-manifest.js";
const plan=createPhase2DryRunPlan(PHASE2_REHEARSAL);
process.stdout.write(JSON.stringify(plan,null,2)+"\n");
