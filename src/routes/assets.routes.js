import { Router } from 'express';
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';

const router = Router();

// create an asset
router.post('/create', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { productName, productImage, productType, productQuantity} = req.body;
    if (!productName || !productType || !productQuantity) {
        return res.status(401).json({ message: "Missing data" });
    }

    if (typeof productQuantity !== 'number' || productQuantity < 1) {
        return res.status(400).json({ message: 'Invalid product quantity' });
    }

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');
        const hrCollection = db.collection('hrs');

        const email = req.user.email;
        const hrDetails = await hrCollection.findOne({ email });

        const newAsset = {
            productName,
            productImage: productImage || '',
            productType,
            productQuantity,
            availableQuantity: productQuantity,
            dateAdded: new Date(),
            hrEmail: email,
            companyName: hrDetails?.companyName || 'Company',
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


// get assets of a hr with pagination support
router.get('/hr', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email, page = 1, limit = 10 } = req.query;

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const pageNum = parseInt(page, 10) || 1;
        const lim = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * lim;

        const [items, total] = await Promise.all([
            assetsCollection.find({ hrEmail: email }).skip(skip).limit(lim).toArray(),
            assetsCollection.countDocuments({ hrEmail: email })
        ]);

        res.status(200).json({ items, total, page: pageNum, limit: lim });
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

// direct assignment by HR to an already-affiliated employee
router.post('/assign', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { assetId, employeeEmail } = req.body;
    if (!assetId || !employeeEmail) return res.status(400).json({ message: 'Missing data' });
    if (!ObjectId.isValid(assetId)) return res.status(400).json({ message: 'Invalid asset id' });

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');
        const affiliationsCollection = db.collection('affiliations');
        const assignedAssetsCollection = db.collection('assignedAssets');
        const hrCollection = db.collection('hrs');

        const hrEmail = req.user.email;

        const asset = await assetsCollection.findOne({ _id: new ObjectId(assetId) });
        if (!asset) return res.status(404).json({ message: 'Asset not found' });
        if ((asset.availableQuantity || 0) <= 0) return res.status(400).json({ message: 'Asset unavailable' });

        // check affiliation
        const affiliation = await affiliationsCollection.findOne({ employeeEmail, hrEmail });
        if (!affiliation || affiliation.status === 'inactive') {
            return res.status(400).json({ message: 'Employee not affiliated with your company' });
        }

        // check hr package limit
        const hr = await hrCollection.findOne({ email: hrEmail });
        if (!hr) return res.status(404).json({ message: 'HR not found' });
        if ((hr.currentEmployees || 0) >= (hr.packageLimit || 0)) return res.status(400).json({ message: 'Package limit reached' });

        // create assigned asset
        const assigned = {
            assetId: new ObjectId(asset._id),
            assetName: asset.productName,
            assetImage: asset.productImage,
            assetType: asset.productType,
            employeeEmail,
            employeeName: affiliation.employeeName,
            hrEmail,
            companyName: hr.companyName,
            assignmentDate: new Date(),
            returnDate: null,
            status: 'assigned'
        };

        await assignedAssetsCollection.insertOne(assigned);
        await assetsCollection.updateOne({ _id: new ObjectId(asset._id) }, { $inc: { availableQuantity: -1 } });

        // increment hr current employees only if this is first active affiliation (handled elsewhere normally)
        res.status(201).json({ message: 'Assigned' });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// update an asset (HR only)
router.patch('/update', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.query;
    if (!id || !ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const { productName, productImage, productType, productQuantity } = req.body;

    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');
        const { email } = req.user;

        const asset = await assetsCollection.findOne({ _id: new ObjectId(id) });
        if (!asset) return res.status(404).json({ message: 'Asset not found' });
        if (asset.hrEmail !== email) return res.status(403).json({ message: 'Forbidden' });

        const updateFields = {};
        if (productName) updateFields.productName = productName;
        if (productImage !== undefined) updateFields.productImage = productImage;
        if (productType) updateFields.productType = productType;

        // handle quantity changes and adjust availableQuantity accordingly
        if (productQuantity !== undefined) {
            const qty = Number(productQuantity);
            if (Number.isNaN(qty) || qty < 0) return res.status(400).json({ message: 'Invalid product quantity' });

            const oldTotal = asset.productQuantity || 0;
            const oldAvailable = asset.availableQuantity || 0;
            const diff = qty - oldTotal; // positive means adding new stock
            const newAvailable = oldAvailable + diff;
            if (newAvailable < 0) {
                return res.status(400).json({ message: 'Cannot reduce quantity below number currently assigned' });
            }

            updateFields.productQuantity = qty;
            updateFields.availableQuantity = newAvailable;
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        await assetsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

        const updated = await assetsCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json({ message: 'Asset updated', asset: updated });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// delete a asset
router.delete('/delete', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { id } = req.query;
    if (!id || !ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
    
    try {
        const db = getDB();
        const assetsCollection = db.collection('assets');

        const { email } = req.user;
        const assetToDelete = await assetsCollection.findOne({ _id: new ObjectId(id) });
        if(!email || !assetToDelete) {
            return res.status(400).json({ message: "Bad request" });
        }
        if(assetToDelete.hrEmail !== email) {
            return res.status(403).json({ message: "Forbidden" });
        }
        
        const deletedOne = await assetsCollection.deleteOne({ _id: new ObjectId(id) })
        return res.status(200).json({ message: "Deleted successfully" });
    }
    catch(err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
})

export default router;
