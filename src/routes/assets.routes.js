import express, { Router } from 'express';
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';

const router = Router();

// create a asset
router.post('/create', verifyJWT, verifyRole('hr'), async (req, res) => {
    
    const { productName, productImage, productType, productQuantity, availableQuantity, hrEmail, companyName } = req.body;
    if(!productName || !productImage || !productType || !productQuantity || !availableQuantity || !hrEmail || !companyName ) {
        return res.status(401).json({ message: "Mission data" });
    }

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const newAsset = {
            productName,
            productImage,
            productType,
            productQuantity,
            availableQuantity,
            dateAdded: new Date(),
            hrEmail,
            companyName,
        }
        
        const result = await assetsCollection.insertOne(newAsset);

        res.status(201).json({ message: "Asset created successfully" })
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
})


// get a single asset
router.get('/:id', verifyJWT, verifyRole('employee', 'hr'), async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();
        const assetsCollection = db.collection('assets')

        const result = await assetsCollection.findOne({ _id: new ObjectId(id) });

        res.status(200).json(result);
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server error" });
    }
})

// get assets of a hr
router.get('/hr/:email', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email } = req.params;

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const hrAssets = await assetsCollection.find({ hrEmail: email }).toArray();

        console.log(hrAssets)
        if(hrAssets) res.status(200).json(hrAssets);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error"})
    }
})



export default router;