import express from 'express'
import { getDB } from '../config/db.js';

const router = express.Router();

router.get('/user', async (req, res) => {
    const { email } = req.query;
    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email });

        res.status(200).json(user);
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
})


export default router;