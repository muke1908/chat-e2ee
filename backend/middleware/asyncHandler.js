module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    // eslint-disable-next-line promise/no-callback-in-promise
    .catch((e) => {
      return res.status(500).send({ error: e.message });
    });
};
