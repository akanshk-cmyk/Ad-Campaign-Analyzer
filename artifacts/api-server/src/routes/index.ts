import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaignAssistantRouter from "./campaign-assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campaignAssistantRouter);

export default router;
