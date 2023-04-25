import { Request, Response } from 'express';
export default (fn) => (req: Request, res: Response, next) => {
  Promise.resolve(fn(req, res, next)).catch((e) => {
    return res.status(500).send({ error: e.message });
  });
};
