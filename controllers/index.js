/**
 * Created by joe
 * Date: 2018/7/20
 * Time: 下午1:32
 */
module.exports = {
	'GET /': async (ctx, next) => {
		let user = ctx.state.user;
		if (user) {
			ctx.render('room.html', {
				user: user
			});
		} else {
			ctx.response.redirect('/signin');
		}
	}
};