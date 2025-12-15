import express from 'express'
import { verifyJWT, verifyRole } from '../middlewares/auth.js';
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';
const router = express.Router();

router.get('/affiliation', verifyJWT, verifyRole('hr'), async (req, res) => {
    const { email, page = 1, limit = 10 } = req.query;
    try {
        const db = getDB();
        const affiliationsCollection = db.collection('affiliations');

        const pageNum = parseInt(page, 10) || 1;
        const lim = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * lim;

        const [items, total] = await Promise.all([
            affiliationsCollection.find({ hrEmail: email, status: 'active' }).skip(skip).limit(lim).toArray(),
            affiliationsCollection.countDocuments({ hrEmail: email, status: 'active' })
        ]);

        res.status(200).json({ items, total, page: pageNum, limit: lim });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
})

router.patch('/remove', verifyJWT, verifyRole('hr'), async (req, res) => {
    // expects affiliation id in query: ?id=<affiliationId>
    const { id } = req.query;
    if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid affiliation id' });
    }

    try {
        const db = getDB();
        const { email } = req.user; // logged in hr
        const affiliationsCollection = db.collection('affiliations');
        const hrCollection = db.collection('hrs');
        const assignedAssetsCollection = db.collection('assignedAssets');
        const assetsCollection = db.collection('assets');

        const affiliation = await affiliationsCollection.findOne({ _id: new ObjectId(id) });
        if (!affiliation) return res.status(404).json({ message: 'Affiliation not found' });

        if (affiliation.hrEmail !== email) return res.status(403).json({ message: 'Forbidden' });

        await affiliationsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: 'inactive' } }
        );

        const assignedAssets = await assignedAssetsCollection.find({
            employeeEmail: affiliation.employeeEmail,
            hrEmail: affiliation.hrEmail,
            status: 'assigned'
        }).toArray();

        for (const a of assignedAssets) {
            try {
                await assignedAssetsCollection.updateOne(
                    { _id: a._id },
                    { $set: { status: 'returned', returnDate: new Date() } }
                );

                if (a.assetId) {
                    await assetsCollection.updateOne(
                        { _id: new ObjectId(a.assetId) },
                        { $inc: { availableQuantity: 1 } }
                    );
                }
            } catch (innerErr) {
                console.log('Error updating assigned asset', innerErr);
            }
        }

        const hrDoc = await hrCollection.findOne({ email });
        if (hrDoc) {
            const newCount = Math.max(0, (hrDoc.currentEmployees || 0) - 1);
            await hrCollection.updateOne({ email }, { $set: { currentEmployees: newCount } });
        }

        res.status(200).json({ message: 'Affiliation removed' });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: "internal server error" });
    }
})

export default router;