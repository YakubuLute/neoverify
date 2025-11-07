import { Router } from 'express';
import {
    getInvitationDetails,
    acceptInvitation,
    declineInvitation,
    acceptInvitationValidation,
    invitationTokenValidation,
} from '../controllers/invitation.controller';

const router = Router();

// Public routes (no authentication required)
router.get('/:token', invitationTokenValidation, getInvitationDetails);
router.post('/accept', acceptInvitationValidation, acceptInvitation);
router.post('/:token/decline', invitationTokenValidation, declineInvitation);

export default router;