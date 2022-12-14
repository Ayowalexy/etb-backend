const verifyToken = function(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ')
        const bearerToken = bearer[0]
        req.token = bearerToken;
        next()
    } else {
        res.sendStatus(403)
    }
}

module.exports = verifyToken