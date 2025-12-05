import express from 'express'

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        message: "Health Check",
        time: new Date()
    })
})


export default router;