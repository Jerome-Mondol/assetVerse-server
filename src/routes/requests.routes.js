import { verifyJWT, verifyRole } from "../middlewares/auth";
import express from express;

const router = express.Router();


router.post('/assets', verifyJWT, verifyRole('employee'), (req, res) => {
         
})