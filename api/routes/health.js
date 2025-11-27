/*
* This is a "health check" API route.
* Enterprise systems (like Kubernetes) use this to see
* if your microservice is alive and healthy.
*/

import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Chat service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;