/**
 * Created by joe
 * Date: 2018/7/20
 * Time: 上午11:43
 */
const url = require('url');

const ws = require('ws');

const Cookies = require('cookies');

const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./controller');

const templating = require('./templating');

let WebSocketServer = ws.Server;

const app = new Koa();

// log request URL:
app.use(async (ctx, next) => {
	console.log(`${ctx.request.method} ${ctx.request.url}`); // 打印URL
	await next();
});

// parse user from cookie:
app.use(async (ctx, next) => {
	ctx.state.user = parseUser(ctx.cookies.get('name') || '');
	await next();
});

// static file support:
let staticFiles = require('./static-files');
app.use(staticFiles('/static/', __dirname + '/static'));

// parse request body:
app.use(bodyParser());

// add nunjucks as view:
app.use(templating('views', {
	noCache: true,
	watch: true
}));

// add controller middleware:
app.use(controller());

//  koa app的listen()方法返回http.Server:
let server = app.listen(3000);

function parseUser(obj) {
	if (!obj) {
		return;
	}
	console.log('try parse: ' + obj);
	let s = '';
	if (typeof obj === 'string') {
		s = obj;
	} else if (obj.headers) {
		let cookies = new Cookies(obj, null);
		s = cookies.get('name');
	}
	if (s) {
		try {
			let user = JSON.parse(Buffer.from(s, 'base64').toString());
			console.log(`User: ${user.name}, ID: ${user.id}`);
			return user;
		} catch (e) {
			// ignore
		}
	}
}

function createWebSocketServer(server, onConnection, onMessage, onClose, onError) {
	let wss = new WebSocketServer({
		server: server
	});
	wss.broadcast = function broadcast(data) {
		wss.clients.forEach(function each(client) {
			client.send(data);
		});
	};
	onConnection = onConnection || function () {
		console.log('[WebSocket] connected.');
	};
	onMessage = onMessage || function (msg) {
		console.log('[WebSocket] message received: ' + msg);
	};
	onClose = onClose || function (code, message) {
		console.log(`[WebSocket] closed: ${code} - ${message}`);
	};
	onError = onError || function (err) {
		console.log('[WebSocket] error: ' + err);
	};
	wss.on('connection', function (ws) {
		let location = url.parse(ws.upgradeReq.url, true);
		console.log('[WebSocketServer] connection: ' + location.href);
		ws.on('message', onMessage);
		ws.on('close', onClose);
		ws.on('error', onError);
		if (location.pathname !== '/ws/chat') {
			// close ws:
			ws.close(4000, 'Invalid URL');
		}
		// check user:
		let user = parseUser(ws.upgradeReq);
		if (!user) {
			ws.close(4001, 'Invalid user');
		}
		ws.user = user;
		ws.wss = wss;
		onConnection.apply(ws);
	});
	console.log('WebSocketServer was attached.');
	return wss;
}

var messageIndex = 0;

function createMessage(type, user, data) {
	messageIndex++;
	return JSON.stringify({
		id: messageIndex,
		type: type,
		user: user,
		data: data
	});
}


function onConnect() {
	let user = this.user;
	let msg = createMessage('join', user, `${user.name} joined.`);
	this.wss.broadcast(msg);
	// build user list:
	let users = this.wss.clients.map(function (client) {
		return client.user;
	});
	this.send(createMessage('list', user, users));
}

function onMessage(message) {
	console.log(message);
	if (message && message.trim()) {
		let msg = createMessage('chat', this.user, message.trim());
		this.wss.broadcast(msg);
	}
}

function onClose() {
	let user = this.user;
	let msg = createMessage('left', user, `${user.name} is left.`);
	this.wss.broadcast(msg);
}

app.wss = createWebSocketServer(server, onConnect, onMessage, onClose);

console.log('app start at port 3000...');


// const Sequelize = require('sequelize');
// const config = require('./config');
// console.log('init sequelize...');
// var sequelize = new Sequelize(config.database, config.username, config.password, {
// 	host: config.host,
// 	dialect: 'mysql',
// 	pool: {
// 		max: 5,
// 		min: 0,
// 		idle: 30000
// 	}
// });
// var Pet = sequelize.define('pet', {
// 	id: {
// 		type: Sequelize.STRING(50),
// 		primaryKey: true,
// 	},
// 	name: Sequelize.STRING(100),
// 	gender: Sequelize.BOOLEAN,
// 	birth: Sequelize.STRING(10),
// 	createdAt: Sequelize.BIGINT,
// 	updatedAt: Sequelize.BIGINT,
// 	version: Sequelize.BIGINT
// }, {
// 	timestamps: false
// });
//
// var now = Date.now();
// Pet.create({
// 	id: 'g-' + now,
// 	name: 'Gaffey',
// 	gender: false,
// 	birth: '2007-07-07',
// 	createdAt: now,
// 	updatedAt: now,
// 	version: 0
// }).then(function (p) {
// 	console.log('created.' + JSON.stringify(p));
// }).catch(function (err) {
// 	console.log('failed: ' + err);
// });
//
// (async () => {
// 	var dog = await Pet.create({
// 		id: 'd-' + now,
// 		name: 'Odie',
// 		gender: false,
// 		birth: '2008-08-08',
// 		createdAt: now,
// 		updatedAt: now,
// 		version: 0
// 	});
// 	console.log('created: ' + JSON.stringify(dog));
// })();
//
//
// (async () => {
// 	var pets = await Pet.findAll({
// 		where: {
// 			name: 'Gaffey'
// 		}
// 	});
// 	console.log(`find ${pets.length} pets:`);
// 	for (let p of pets) {
// 		console.log(JSON.stringify(p));
// 		console.log('update pet...');
// 		p.gender = true;
// 		p.updatedAt = Date.now();
// 		p.version++;
// 		await p.save();
// 		if (p.version === 3) {
// 			await p.destroy();
// 			console.log(`${p.name} was destroyed.`);
// 		}
// 	}
// })();

