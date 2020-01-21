const koa = require('koa');
const server = require('koa-static');
const api = require('./middleware/api');

const app = new koa();
const port = 3003;

app.use(api);

app.use(server(__dirname, '/client'));

app.listen(port, () => {
    console.log(`listen port ${port}`);
})