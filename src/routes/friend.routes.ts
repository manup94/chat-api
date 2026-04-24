import { Router } from 'express';
import { sendFriendRequest, getFriendRequests, updateFriendRequest, getFriends } from '../controllers/friend.controller';
import { authenticateUser as authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, sendFriendRequest);
router.get('/', authenticate, getFriendRequests);
router.put('/:id', authenticate, updateFriendRequest);
router.get('/confirmed', authenticate, getFriends);

export default router;
