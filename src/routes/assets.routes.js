import { Router } from 'express';
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';

const router = Router();

// create an asset
router.post('/create', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { productName, productImage, productType, productQuantity} = req.body;
    if (!productName || !productImage || !productType || !productQuantity) {
        return res.status(401).json({ message: "Missing data" });
    }

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');
        const hrCollection = db.collection('hrs');

        const email = req.user.email;
        const hrDetails = await hrCollection.findOne({ email });

        const newAsset = {
            productName,
            productImage,
            productType,
            productQuantity,
            availableQuantity: productQuantity,
            dateAdded: new Date(),
            hrEmail: email,
            companyName: hrDetails.companyName,
        };

        const createdAsset = await assetsCollection.insertOne(newAsset);

        res.status(201).json({ message: "Asset created successfully",  createdAsset});
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// get all assets 
router.get('/get-all-assets', verifyJWT, verifyRole('hr', 'employee'), async (req, res) => {
    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');
        const assets = await assetsCollection.find({}).toArray();
        if(assets) res.status(200).json(assets)
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" })
    }
})

// get a single asset
router.get('/asset', verifyJWT, verifyRole('employee', 'hr'), async (req, res) => {
    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
    }

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const asset = await assetsCollection.findOne({ _id: new ObjectId(id) });

        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }

        res.status(200).json(asset);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
});


// get assets of a hr 
router.get('/hr', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email } = req.query;

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const hrAssets = await assetsCollection.find({ hrEmail: email }).toArray();

        res.status(200).json(hrAssets);
        console.log(hrAssets)
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
});


// get assets of a employee
router.get('/employee', verifyJWT, verifyRole('employee'), async (req, res) => {
    const { email } = req.query;

    try {
        const db = getDB();
        const assignedAssets = db.collection('assignedAssets');
        const userAsset = await assignedAssets.find({ employeeEmail: email }).toArray();

        if(userAsset) res.status(200).json(userAsset);
    }
    catch(err) {
        console.log(err)
        res.status(500).json({ message: "Internal server error" });
    }
})


// delete a asset
router.delete('/delete', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.query;
    
    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const { email } = req.user;
        const assetToDelete = await assetsCollection.findOne({ _id: new ObjectId(id) });
        if(!email || !assetToDelete) {
            res.status(400).json({ message: "Bad request" });
        }
        if(assetToDelete.hrEmail !== email) {
            res.status(403).json({ message: "Forbidden" });
        }
        
        const deletedOne = await assetsCollection.deleteOne({ _id: new ObjectId(id) })
        res.status(200).json({ message: "Deleted successfully" });
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
})







export default router;
