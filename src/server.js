import express from 'express'
import cors from 'cors'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import assetsRoutes from './routes/assets.routes.js'
import requestRoutes from './routes/requests.routes.js'
import userRoutes from './routes/users.routes.js'
import affiliationsRoute from './routes/affiliations.routes.js'
import { connectDB } from './config/db.js';


const app = express();


const PORT = process.env.PORT;

// Middlewares 
app.use(express.json());
app.use(cors());


const startServer = async () => {
    try {
        await connectDB();

        // Routes
        app.use('/', healthRoutes);
        app.use('/auth', authRoutes);
        app.use('/assets', assetsRoutes);
        app.use('/request', requestRoutes);
        app.use('/users', userRoutes)
        app.use('/affiliations', affiliationsRoute)

        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

startServer();


