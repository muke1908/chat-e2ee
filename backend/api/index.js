const express = require('express');
const router = express.Router({ mergeParams: true });

router.get('/', async(req, res) => {
    res.send({ message: 'working!' })
})

module.exports = router;
