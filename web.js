const express = require('express')
const fs = require('fs')
const sendmail = require('sendmail')();
var session = require('express-session');


const filePath = __dirname + '/clients.json'
let list = JSON.parse(fs.readFileSync(filePath))

const app = express()

const PORT = 80

function getCurrentTime() {
	return Math.floor(new Date() / 1000)
}

function sendMail(mail, title, content) {
	sendmail({
		from: 'no-reply@yourdomain.com',
		to: mail,
		subject: title,
		html: content,
	}, function (err, reply) {
		console.log(err && err.stack);
		console.dir(reply);
	});
}

app.use(express.static(__dirname + '/static'))
app.use(session({
	secret: 'ASDFPASSWORD!#@$@#$',
	resave: false,
	saveUninitialized: true
}));

app.get('/enter', (req, res) => {
	console.log(req.query.pw + '/' + list.meta.masterPw)
	if (req.query.pw == list.meta.masterPw) {
		var sess = req.session
		sess.auth = true
		res.redirect('/setting')
	} else res.redirect('/login.html?m=비밀번호가 틀립니다.')
})

app.get('/logout', (req, res) => {
	if (!req.session.auth) return res.redirect('/login.html?m=로그인이 필요합니다.')
	req.session.auth = false
	req.session.destroy()
	res.redirect('/login.html?m=로그아웃되었습니다.')
})


app.get('/', (req, res) => {
	var id = req.query.id
	var pw = req.query.pw
	var u = req.query.u
	console.log('-------------------------------------------------------------------------\n')
	console.log('Requested : ' + id + '/' + pw)
	for (var i = 0; i < list.users.length; i++) {
		var user = list.users[i]
		if (user.id == id && user.pw == pw) {
			console.log('Auth : ' + id + '/' + pw + '/' + u)
			if (!user.date) {
				console.log('No user date so updated.')
				list.users[i].date = getCurrentTime()
			}
			if (!user.u) {
				console.log('User unique key created')
				list.users[i].u = u
			}
			if (getCurrentTime() - user.date > user.expireTerm * 60 * 60 * 1000) {
				console.log('Expire date out')
				break
			}
			if (user.u != u) {
				console.log('Different unique key')
				break
			}
			console.log('Authenticated')
			return res.send(true)
		}
	}
	console.log('Authentication failed')
	res.send(false)
})

app.get('/setting', (req, res) => {
	if (!req.session.auth) return res.redirect('/login.html?m=로그인이 필요합니다.')
	res.sendFile(__dirname + '/static/setting.html')

})

app.get('/data', (req, res) => {
	if (!req.session.auth) return res.redirect('/login.html?m=로그인이 필요합니다.')
	res.sendFile(__dirname + '/clients.json')
})

app.get('/set', (req, res) => {
	if (!req.session.auth) return res.redirect('/login.html?m=로그인이 필요합니다.')
	for (var i = 0; i < list.users.length; i++) {
		var user = list.users[i]
		if (user.id == req.query.id) {
			list.users[i].date = getCurrentTime()
			return res.send(true)
		}
	}
	res.send(false)
})

app.get('/add', (req, res) => {
	if (!req.session.auth) return res.redirect('/login.html?m=로그인이 필요합니다.')
	if (!req.query) return res.send({ success: false, message: "데이터가 없습니다." })
	if (!req.query.id) return res.send({ success: false, message: "ID가 없습니다." })
	if (!req.query.name) return res.send({ success: false, message: "이름이 없습니다." })
	if (!req.query.phone) return res.send({ success: false, message: "전화번호가 없습니다." })
	if (!req.query.pw) return res.send({ success: false, message: "패스워드가 없습니다." })
	if (!req.query.expireTerm) return res.send({ success: false, message: "사용기한이 없습니다." })
	for (var i = 0; i < list.users.length; i++) {
		var user = list.users[i]
		if (user.id == req.query.id) return res.send({ success: fase, message: "회원이 이미 존재합니다." })
	} list.users.push(req.query)
	res.send({ success: true, message: "Success" })
})

app.get('/rm', (req, res) => {
	if (!req.session.auth) return res.redirect('/login.html?m=로그인이 필요합니다.')
	if (!req.query.id) return res.send({ success: false, message: "데이터가 없습니다." })
	for (var i = 0; i < list.users.length; i++) {
		var user = list.users[i]
		if (user.id == req.query.id) {
			list.users.splice(i, 1)
			return res.send({ success: true, message: "Success" })
		}
	}
	res.send({ success: false, message: "그런 유저가 없습니다." })
})

setInterval(() => fs.writeFileSync(filePath, JSON.stringify(list)), 1000);
setInterval(() => {
	for (var i = 0; i < list.users.length; i++) {
		if (getCurrentTime() - list.users[i] > list.users[i].expireTerm * 60 * 60 * 1000) {
			console.log('Autentication renew mail send : ' + list.users[i].id)
			sendMail(list.users[i].id, '프로그램 사용 기한 안내', '프로그램 사용 기한이 만료되었습니다. 새로 신청해주세요.')
		}
	}
}, 1000 * 60 * 60);

app.listen(PORT, () => console.log('Server started at port ' + PORT))
