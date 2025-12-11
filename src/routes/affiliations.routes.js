import express from 'express'
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';
const router = express.Router();

router.get('/affiliation', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email } = req.query;
    try {
        const db = getDB();
        const affiliationsCollection = db.collection('affiliations');
        const affiliationOfCompany = await affiliationsCollection.find({
            hrEmail: email,
            status: "active"
        }).toArray();

        

        if (affiliationOfCompany) res.status(200).json(affiliationOfCompany)
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
})

router.patch('/remove', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.query;
    try {
        const db = getDB();
        const { email } = req.user;
        const affiliationsCollection = db.collection('affiliations');
        const hrCollection = db.collection('hrs');
        const currentEmployeesOfHr = await hrCollection.findOne({ email });



        await affiliationsCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'inactive',
                }
            }
        )

        if (currentEmployeesOfHr) {
            await hrCollection.updateOne(
                { email: email },
                {
                    $set: {
                        currentEmployees: currentEmployeesOfHr.currentEmployees - 1
                    }
                }
            )
        }

        res.status(200).json({ message: "All ok" })
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: "internal server error" });
    }
})

export default router;