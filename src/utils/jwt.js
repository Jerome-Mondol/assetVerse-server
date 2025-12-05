import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const SECRET_KEY = process.env.JWT_SECRET;

export const generateToken = (user) => {
    const { _id, email, role } = user;
    return jwt.sign({
        id: _id,
        email,
        role
    }, SECRET_KEY);
}

