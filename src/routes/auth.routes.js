import express from 'express'
import { getDB } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { verifyJWT, verifyRole } from '../middlewares/auth.js';



const router = express.Router();

router.post('/hr/register', async (req, res) => {
    const { name, companyName, companyLogo, email, dateOfBirth } = req.body;
    if (!name || !companyName || !companyLogo || !email || !dateOfBirth) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const db = getDB();
        const hrCollection = db.collection("HRs");
        const usersCollection = db.collection("users");


        const existingUser = await hrCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newHR = {
            name,
            companyName,
            companyLogo,
            email,
            dateOfBirth,
            role: "hr",
            packageLimit: 5,
            currentEmployees: 0,
            subscription: 'basic',
            firebaseUID: "test"
        }

        const newUser = {
            name,
            email,
            role: "hr",
            companyName,
            companyLogo,
            packageLimit: 5,
            currentEmployees: 0,
            subscription: 'basic',
            dateOfBirth,
            profileImage: 'nope',
            createdAt: new Date(),
            updatedAt: new Date()
        }


        const result = await hrCollection.insertOne(newHR);
        const userResult = await usersCollection.insertOne(newUser)
        res.status(201).json({ message: 'HR registered successfully' });

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
})

router.post('/employee/register', async (req, res) => {
    const { name, email, dateOfBirth } = req.body;
    if (!name || !email || !dateOfBirth) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const db = getDB();
        const employeeCollection = db.collection('employees');
        const usersCollection = db.collection("users");


        const existingUser = await employeeCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const newEmployee = {
            name,
            email,
            dateOfBirth,
            role: "employee",
            firebaseUID: 'test'
        }

        const newUser = {
            name,
            email,
            role: "employee",
            dateOfBirth,
            profileImage: 'nope',
            createdAt: new Date(),
            updatedAt: new Date()
        }


        const result = await employeeCollection.insertOne(newEmployee);
        const userResult = await usersCollection.insertOne(newUser)
        res.status(201).json({ message: 'Employee registered successfully', userId: result.insertedId });

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });

    }
})


router.post('/login', async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email    required" });

    try {
        const db = getDB();
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = generateToken(user);
        console.log(token);
        res.status(200).json({
            message: "Login successful",
            token
        })
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
})


export default router;