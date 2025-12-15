import express from 'express'
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.patch('/return', verifyJWT, verifyRole('employee'), async (req, res) => {
  const { id } = req.query;
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

  try {
    const db = getDB();
    const assignedAssetsCollection = db.collection('assignedAssets');
    const assetsCollection = db.collection('assets');

    const assigned = await assignedAssetsCollection.findOne({ _id: new ObjectId(id) });
    if (!assigned) return res.status(404).json({ message: 'Assigned asset not found' });

    if (assigned.employeeEmail !== req.user.email) return res.status(403).json({ message: 'Forbidden' });

    if (assigned.status === 'returned') return res.status(400).json({ message: 'Asset already returned' });

    await assignedAssetsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'returned', returnDate: new Date() } }
    );

    if (assigned.assetId) {
      try {
        await assetsCollection.updateOne(
          { _id: new ObjectId(assigned.assetId) },
          { $inc: { availableQuantity: 1 } }
        );
      } catch (e) {
        console.log('Failed to increment asset availability', e);
      }
    }

    res.status(200).json({ message: 'Return processed' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'internal server error' });
  }
});

// assign e new asset
router.post('/assign-assets', verifyJWT, verifyRole('hr'), async(req, res) => {
  const { employeeEmail, hrEmail, assetId } = req.body;
  if(!employeeEmail || !assetId || !hrEmail) res.status(404).json({ message: "All info required" })
  try {
    const db = getDB();
    const assignedAssetsCollection = db.collection('assignedAssets');
    const assetsCollection = db.collection('assets');
    const hrsCollection = db.collection('hrs');

    const assetData = await assetsCollection.findOne({ _id: new ObjectId(assetId) });
    const hrData = await hrsCollection.findOne({ email: hrEmail })

    const newAssignedAsset = {
      assetId,
      assetName: assetData.productName,
      assetType: assetData.productType,
      assetImage: assetData.productImage,
      employeeEmail,
      hrEmail,
      companyName: hrData.companyName,
      assignmentDate: new Date(),
      returnDate: null,
      status: 'assigned' 
    }

    const assignNewAsset = await assignedAssetsCollection.insertOne(newAssignedAsset);

    res.status(200).json({ message: "Asset assigned successfully" });

  }
  catch(err) {
    console.log(err);
    res.status(500).json({ message: "internal server error  " })
  }
})

export default router;
