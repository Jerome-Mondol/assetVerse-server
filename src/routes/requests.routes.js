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

        const newRequest = {
            assetId: new ObjectId(id),
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

        const result = await requestsCollection.insertOne(newRequest);
        res.status(201).json({ message: "Request sent successfully", result });
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
        const affiliationCollection = db.collection('affiliations');
        const hrCollection = db.collection('hrs');
        const assetsCollection = db.collection('assets')
        const assignedAssetsCollection = db.collection('assignedAssets');

        
        const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        if(request.requestStatus !== 'pending') return res.status(400).json({ message: "Decision already given" })

        const companyDetails = await hrCollection.findOne({ email: request.hrEmail });
        const asset = await assetsCollection.findOne({ _id: new ObjectId(request.assetId) })
        const currentAffiliation = await affiliationCollection.findOne({ hrEmail: request.hrEmail });
        await requestsCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    approvalDate: new Date(),
                    requestStatus: 'approved',
                    processedBy: req.user.email
                }
            }
        );

        await assetsCollection.updateOne(
            { _id : new ObjectId(asset._id) },
            {
                $set: {
                    availableQuantity: asset.availableQuantity - 1,
                }
            }
        )




        const affiliation = {
            employeeEmail: request.requesterEmail,
            employeeName: request.requesterName,
            hrEmail: request.hrEmail,
            companyName: companyDetails.companyName,
            companyLogo: companyDetails.companyLogo,
            affiliationDate: new Date(),
            status: 'active',
        }   

        const assignedAsset = {
            assetId: new ObjectId(asset._id),
            assetName: asset.productName,
            assetType: asset.productType,
            assetImage: asset.productImage,
            employeeEmail: request.requesterEmail,
            employeeName: request.requesterName,
            hrEmail: request.hrEmail,
            companyName: request.companyName,
            assignmentDate: new Date(),
            returnDate: null,
            status: 'assigned',
        }


        if(!currentAffiliation) await affiliationCollection.insertOne(affiliation);
        await assignedAssetsCollection.insertOne(assignedAsset)
    
        res.status(200).json({ message: "Request accepted", currentAffiliation });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
});


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