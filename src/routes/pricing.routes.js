import express from 'express'
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
const router = express.Router();

router.get('/all-packages', verifyJWT, verifyRole('hr', 'employee'), async (req, res) => {
    try {
        const db = getDB();
        const packagesCollection = db.collection('packages');
        const allPackages = await packagesCollection.find({  }).toArray();

        if(allPackages) res.status(200).json(allPackages)
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
})

export default router;
