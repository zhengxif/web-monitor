let apiMap = {
    '/api/list': [
        {id: '1', name: '香蕉'},
        {id: '2', name: '桔子'},
        {id: '3', name: '苹果'},
        {id: '4', name: '橘子'},
        {id: '5', name: '菠萝'},
        {id: '6', name: '橙子'},
        {id: '7', name: '西瓜'},
        {id: '8', name: '桃子'},
        {id: '9', name: '辣椒'},
    ],
}
module.exports = async (ctx, next) => {
    for (let key in apiMap) {
        if (ctx.path.includes(key)) {
            ctx.body = apiMap[key];
            break;
        }
    }
    return next();
}