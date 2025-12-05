import express, { Router } from 'express';
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';

const router = Router();

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

export default router;