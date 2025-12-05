import { verifyJWT, verifyRole } from "../middlewares/auth.js";
import express from 'express';
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();


router.post('/asset/:id', verifyJWT, verifyRole('employee'), async (req, res) => {
    const { note } = req.body;
    
    
    try {
        const db = getDB();
        const requestsCollection = db.collection('requests');
        const assetsCollection = db.collection('assets');
        const usersCollection = db.collection('users');
        const { id } = req.params;
        const userID = req.user.id;

        const requestSentBy = await usersCollection.findOne({ _id: new ObjectId(userID)})
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
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server error" });
    }
})


export default router;