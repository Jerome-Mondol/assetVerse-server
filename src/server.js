import express from 'express'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import { connectDB } from './config/db.js';


const app = express();


const PORT = process.env.PORT;

// Middlewares 
app.use(express.json());


const startServer = async () => {
    try {
        await connectDB();

        // Routes
        app.use('/', healthRoutes);
        app.use('/auth', authRoutes)

        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();


