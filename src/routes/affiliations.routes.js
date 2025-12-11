import express from 'express'
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
const router = express.Router();

router.get('/affiliation', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email } = req.query;
    try {
        const db = getDB();
        const affiliationsCollection = db.collection('affiliations');
        const affiliationOfCompany = await affiliationsCollection.find({ hrEmail: email}).toArray();

        if(affiliationOfCompany) res.status(200).json(affiliationOfCompany);
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
})

export default router;