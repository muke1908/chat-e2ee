import { Request, Response } from 'express';
export default (fn) => (req: Request, res: Response, next) => {
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error(e);
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : e.message;
    return res.status(500).send({ error: message });
  });
};
