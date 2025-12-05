import express from 'express'
import healthRoutes from './routes/health.routes.js'
const app = express();



const PORT = process.env.PORT || 5000;

// Middlewares 
app.use(express.json());


// Routes
app.use('/', healthRoutes);






app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})