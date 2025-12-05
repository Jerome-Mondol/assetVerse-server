import { verifyJWT, verifyRole } from "../middlewares/auth.js";
import express from 'express';
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Create Request 
router.post('/asset/:id', verifyJWT, verifyRole('employee'), async (req, res) => {
    const { note } = req.body;


    try {
        const db = getDB();
        const requestsCollection = db.collection('requests');
        const assetsCollection = db.collection('assets');
        const usersCollection = db.collection('users');
        const { id } = req.params;
        const userID = req.user.id;

        const requestSentBy = await usersCollection.findOne({ _id: new ObjectId(userID) })
        const asset = await assetsCollection.findOne({ _id: new ObjectId(id) })
        console.log(asset);
        console.log(requestSentBy);

        const newRequest = {
            assetId: id,
            assetName: asset.productName,
            assetType: asset.productType,
            requesterName: requestSentBy.name,
            requesterEmail: requestSentBy.email,
            hrEmail: asset.hrEmail,
            companyName: asset.companyName,
            note,
            requestDate: new Date(),
            approvalDate: null,
            requestStatus: 'pending',
            processedBy: 'pending'
        }

        const result = requestsCollection.insertOne(newRequest);
        res.status(201).json({ message: "Request sent successfully" });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server error" });
    }
})

// Hr accept request 
router.patch('/:id/accept', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.params;

    try {
        const db = getDB();
        const requestsCollection = db.collection('requests');

        const result = await requestsCollection.updateOne({ _id: new ObjectId(id) },
            {
                $set: {
                    approvalDate: new Date(),
                    requestStatus: 'approved',
                    processedBy: req.user.email
                }
            })
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        res.status(200).json({ message: "Request accepted" })
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" })
    }

})

// Hr reject request
router.patch('/:id/reject', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.params;

    try {
        const db = getDB();
        const requestsCollection = db.collection('requests');

        const result = await requestsCollection.updateOne({ _id: new ObjectId(id) },
            {
                $set: {
                    requestStatus: 'rejected',
                    processedBy: req.user.email
                }
            })
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        res.status(200).json({ message: "Request rejected" })
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" })
    }
})


export default router;