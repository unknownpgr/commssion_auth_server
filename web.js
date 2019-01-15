const express = require('express')
const fs = require('fs')
const sendmail = require('sendmail')();

const filePath = __dirname + '/clients.json'
let list = JSON.parse(fs.readFileSync(filePath))

const app = express()

function getCurrentTime() {
	return Math.floor(new Date() / 1000)
}

function sendMail(mail) {
	sendmail({
		from: 'no-reply@yourdomain.com',
		to: mail,
		subject: '사용기간 연장 안내 메일',
		html: '프로그램 사용 기간을 연장해주세요.',
	}, function (err, reply) {
		console.log(err && err.stack);
		console.dir(reply);
	});
}

app.use(express.static(__dirname + '/static'))

app.get('/', (req, res) => {
	var id = req.query.id
	var pw = req.query.pw
	var u = req.query.u
	for (var i = 0; i < list.users.length; i++) {
		var user = list.users[i]
		if (user.id == id && user.pw == pw) {
			console.log('Auth : ' + id + '/' + pw + '/' + u)
			if (!user.date) list.users[i].date = getCurrentTime()
			if (!user.u) list.users[i].u = u
			if (getCurrentTime() - user.date > user.expireTerm || user.u != u) break
			return res.send(true)
		}
	}
	res.send(false)
})

app.get('/setting', (req, res) => {
	res.sendFile(__dirname + '/static/setting.html')
})


app.get('/data', (req, res) => {
	res.sendFile(__dirname + '/clients.json')
})

app.get('/set', (req, res) => {
	for (var i = 0; i < list.users.length; i++) {
		var user = list.users[i]
		if (user.id == req.query.id) {
			list.users[i].date = getCurrentTime()
			return res.send(true)
		}
	}
	res.send(false)
})

setInterval(() => fs.writeFileSync(filePath, JSON.stringify(list)), 1000);
setInterval(() => {
	for (var i = 0; i < list.users.length; i++) {
		if (getCurrentTime() - list.users[i] > list.users[i].expireTerm) {
			sendMail(list.users[i].id)
		}
	}
}, 1000 * 60 * 60);
app.listen(8001, () => console.log('Server started'))