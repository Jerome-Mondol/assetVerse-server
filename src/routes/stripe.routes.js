import express from 'express';
import { ObjectId } from 'mongodb';
import stripe from '../config/stripe.js';
import { connectDB } from '../config/db.js';
import { verifyJWT, verifyRole } from '../middlewares/auth.js';

const router = express.Router();

/**
 * HR → CREATE CHECKOUT SESSION
 */
router.post(
  '/create-checkout-session',
  verifyJWT,
  verifyRole('hr'),
  async (req, res) => {
    try {
      const { packageId } = req.body;
      const hrEmail = req.user.email;

      if (!packageId) {
        return res.status(400).json({ message: 'Package ID is required' });
      }

      const db = await connectDB();

      // 1️⃣ Fetch the selected package
      const selectedPackage = await db
        .collection('packages')
        .findOne({ _id: new ObjectId(packageId) });

      if (!selectedPackage) {
        return res.status(404).json({ message: 'Package not found' });
      }

      // 2️⃣ Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: selectedPackage.name },
              unit_amount: selectedPackage.price * 100
            },
            quantity: 1
          }
        ],
        metadata: {
          hrEmail,
          packageName: selectedPackage.name,
          employeeLimit: selectedPackage.employeeLimit
        },
        success_url: `${process.env.CLIENT_URL?.startsWith('http') ? process.env.CLIENT_URL : 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL?.startsWith('http') ? process.env.CLIENT_URL : 'http://localhost:5173'}/payment-cancel`
      });

      return res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe session creation failed:', err);
      return res.status(500).json({ message: 'Stripe session failed' });
    }
  }
);

/**
 * HR → VERIFY PAYMENT AND UPGRADE PACKAGE
 */
router.get(
  '/verify-payment',
  verifyJWT,
  verifyRole('hr'),
  async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({ message: 'Session ID is required' });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: 'Payment not completed' });
      }

      const { hrEmail, packageName, employeeLimit } = session.metadata;
      const db = await connectDB();

      // 3️⃣ Update HR's subscription and package limit
      const updateResult = await db.collection('hrs').updateOne(
        { email: hrEmail, role: 'hr' },
        {
          $set: {
            subscription: packageName,
            packageLimit: Number(employeeLimit)
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: 'HR not found for update' });
      }

      // 4️⃣ Record payment history
      await db.collection('payments').insertOne({
        hrEmail,
        packageName,
        employeeLimit: Number(employeeLimit),
        amount: session.amount_total / 100,
        transactionId: session.payment_intent,
        status: 'completed',
        paymentDate: new Date()
      });

      return res.json({
        message: 'Package upgraded successfully',
        subscription: packageName,
        packageLimit: Number(employeeLimit)
      });
    } catch (err) {
      console.error('Payment verification failed:', err);
      return res.status(500).json({ message: 'Payment verification failed' });
    }
  }
);

export default router;
