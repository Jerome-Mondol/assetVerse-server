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

router.put('/user', async (req, res) => {
    const { email, ...updateData } = req.body;
    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        const result = await usersCollection.updateOne({ email }, { $set: updateData });

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully" });
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
})

export default router;