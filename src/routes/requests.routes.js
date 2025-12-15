import { verifyJWT, verifyRole } from "../middlewares/auth.js";
import express from 'express';
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.post('/asset', verifyJWT, verifyRole('employee'), async (req, res) => {


    try {
        const db = getDB();
        const requestsCollection = db.collection('requests');
        const assetsCollection = db.collection('assets');
        const usersCollection = db.collection('users');
        const { id } = req.query;
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
            note: "Hello",
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

// HR accepts request
router.patch('/:id/accept', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.params;

    try {
        const db = getDB();

        const requestsCollection = db.collection('requests');
        const affiliationsCollection = db.collection('affiliations');
        const hrCollection = db.collection('hrs');
        const assetsCollection = db.collection('assets');
        const assignedAssetsCollection = db.collection('assignedAssets');

        // --- Fetch the request ---
        const request = await requestsCollection.findOne({ _id: new ObjectId(id) });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.requestStatus !== 'pending') {
            return res.status(400).json({ message: "Decision already given" });
        }

        if (req.user.email !== request.hrEmail) {
            return res.status(403).json({ message: "Forbidden: cannot act on this request" });
        }

        const hr = await hrCollection.findOne({ email: request.hrEmail });
        if (!hr) return res.status(404).json({ message: 'HR not found' });

        const asset = await assetsCollection.findOne({ _id: new ObjectId(request.assetId) });
        if (!asset) return res.status(404).json({ message: 'Asset not found' });

        if ((asset.availableQuantity || 0) <= 0) {
            return res.status(400).json({ message: 'No available items to assign' });
        }

        if ((hr.currentEmployees || 0) >= (hr.packageLimit || 0)) {
            return res.status(400).json({ message: 'Package limit reached. Upgrade required' });
        }

        const currentAffiliation = await affiliationsCollection.findOne({
            employeeEmail: request.requesterEmail,
            hrEmail: request.hrEmail
        });

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
            { _id: new ObjectId(asset._id), availableQuantity: { $gt: 0 } },
            { $inc: { availableQuantity: -1 } }
        );

        let affiliationCreated = false;
        if (!currentAffiliation || currentAffiliation.status === "inactive") {
            const newAffiliation = {
                employeeEmail: request.requesterEmail,
                employeeName: request.requesterName,
                hrEmail: request.hrEmail,
                companyName: hr.companyName,
                companyLogo: hr.companyLogo,
                affiliationDate: new Date(),
                status: 'active',
            };

            await affiliationsCollection.insertOne(newAffiliation);
            affiliationCreated = true;
        }

        if (affiliationCreated) {
            await hrCollection.updateOne(
                { email: hr.email },
                { $inc: { currentEmployees: 1 } }
            );
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
        };

        await assignedAssetsCollection.insertOne(assignedAsset);

        res.status(200).json({
            message: "Request accepted",
            affiliationCreated
        });

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

// Get all request as HR
router.get('/all-requests', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email } = req.query;
    const userEmail = req.user.email;

    if(email !== userEmail) res.status(403).json({ message: "Forbidden" });

    try {
        const db = getDB();
        const requestsCollection = db.collection('requests');
        const requestOfHR = await requestsCollection.find({ hrEmail: email }).toArray();
        if(requestOfHR) res.status(200).json(requestOfHR); 
    }
    catch(err) {
        console.log(err)
        res.status(500).json({ message: "internal server error" });
    }
})


export default router;