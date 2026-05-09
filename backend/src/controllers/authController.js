import { Prisma } from '@prisma/client';
import * as authService from '../services/authService.js';
import { validationResult } from 'express-validator';
import { HttpError } from '../utils/httpError.js';

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const result = await authService.register({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      phone: req.body.phone,
      roleKey: req.body.roleKey,
      companyName: req.body.companyName,
    });
    res.status(201).json({ success: true, ...result });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2022') {
        return next(
          new HttpError(
            503,
            'Database schema is missing new columns. From the backend folder run: npx prisma db push',
          ),
        );
      }
    }
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const result = await authService.login(req.body);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res) {
  res.json({ success: true, user: authService.sanitizeUser(req.user) });
}
