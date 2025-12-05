import express, { Router } from 'express';

const router = Router();

router.post('/create', (req, res) => {
    const { productName, productImage, productType, productQuantity, availableQuantity, dateAdded, hrEmail, companyName } = req.body;

    
})