let express = require('express');
let bd = require('./db');
let router = express.Router();

const secret = 'someSecretString';
const saltRounds = 8;

router.post('/register', (req, res) => {
	res.contentType('application/json');
	bcrypt.hash(req.body.password, saltRounds, (err, password) => {
		if (!err) {
			bd.query("INSERT INTO User (name,password,mail) VALUES (?,?,?)", [req.body.name, password, req.body.email], (error, result) => {
				if (err) throw err;
				res.send({
					error: false
				});
			});
		} else {
			res.send({
				error: err
			});
		}
	});
});

router.post('/login', (req, res) => {
	res.contentType('application/json');
	bd.query("SELECT id, name, password, mail FROM User WHERE mail = ?",[req.body.email], (err, result) => {
		if(err) throw err;
		if (result.length === 0)
			res.status(400).send({ error: true });
		else {
			let user = result[0];
			bcrypt.compare(req.body.password, user.password)
				.then(match => {
					if (match) {
						let infos = {
							id: user.id,
							email: user.mail,
							name: user.name
						};
						let token = jwt.sign(
							infos,
							secret,
							{ expiresIn: '1h' });
						infos.token = token;
						res.status(200).send(infos);
					} else
						res.status(401).send({ error: true });
				});
		}
	});
});

function tokenVerifier(req, res, next) {
	let token = req.headers['x-access-token'];
	if (!token)
		return res.status(403).send({
			auth: false,
			message: 'No token provided.'
		});
	jwt.verify(token, secret, (err, decoded) => {
		if (err)
			return res.status(500).send({
				auth: false,
				message: 'Failed to authenticate token.'
			});
		req.userId = decoded.id;
		next();
	});
}

module.exports = {
	router: router,
	tokenVerifier: tokenVerifier
};
