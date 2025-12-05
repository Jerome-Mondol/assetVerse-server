import express from 'express'
import { getDB } from '../config/db.js';

let db;


const router = express.Router();

router.post('/hr/register', async (req, res) => {
    const { name, companyName, companyLogo, email, dateOfBirth } = req.body;
    if (!name || !companyName || !companyLogo || !email || !dateOfBirth) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        db = getDB();
        const hrCollection = db.collection("HRs");


        const existingUser = await hrCollection.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
        }

        const newUser = {
            name,
            companyName,
            companyLogo,
            email,
            dateOfBirth,
            role: "hr",
            packageLimit: 5,
            currentEmployees: 0,
            subscription: 'basic',
            firebaseUID: "test"
        }

        const result = await hrCollection.insertOne(newUser);
        res.status(201).json({ message: 'HR registered successfully', userId: result.insertedId });

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
})

export default router;