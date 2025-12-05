import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

export const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

    try {
        const decode = jwt.verify(token, SECRET_KEY);
        req.user = decode;
        next();
    } catch (err) {
        console.error("JWT verification error:", err.message);
        return res.status(403).json({ message: "Invalid token" });
    }
}


export const verifyRole = (role) => (req, res, next) => {
    if(!req.user) return res.status(401).json({ message: "Unauthorized" });
    if(req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
} 