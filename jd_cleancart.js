/*
脚本：清空购物车
更新时间：2021-07-24
因其他脚本会加入商品到购物车，故此脚本用来取消清空购物车
默认：每运行一次脚本清空购物车所有商品
建议此脚本运行时间在 其他脚本运行之后 再执行
清空购物车，支持环境变量设置关键字，用@分隔，使用前请认真看对应注释
脚本兼容: Quantumult X, Surge, Loon, JSBox, Node.js, 小火箭
==============Quantumult X===========
[task_local]
#清空购物车
55 17 * * * jd_cleancart.js, tag=清空购物车, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/jd.png, enabled=true
===========Loon============
[Script]
cron "55 17 * * *" script-path=jd_cleancart.js,tag=清空购物车
============Surge=============
清空购物车 = type=cron,cronexp="55 17 * * *",wake-system=1,timeout=3600,script-path=jd_cleancart.js
===========小火箭========
清空购物车 = type=cron,script-path=jd_cleancart.js, cronexpr="55 17 * * *", timeout=3600, enable=true
 */
const $ = new Env('清空购物车');
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const notify = $.isNode() ? require('./sendNotify') : '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', postBody = '', venderCart;
if($.isNode()){
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if(process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
//购物车内容
$.cart = process.env.JD_CART === 'true'; // 当环境变量中存在JD_CART并设置为true时才会执行删除购物车
let removeSize = process.env.JD_CART_REMOVESIZE || 20; // 运行一次取消多全部已关注的商品。数字0表示不取关任何商品
let isRemoveAll = process.env.JD_CART_REMOVEALL || true;    //是否清空，如果为false，则上面设置了多少就只删除多少条
$.keywords = process.env.JD_CART_KEYWORDS || []
$.keywordsNum = 0;
!(async() => {
    console.log('使用前请确保你认真看了注释')
    console.log('看完注释有问题就带着你的问题来找我')
    console.log('tg: https://t.me/X1a0He')
    if($.cart){
        if(!cookiesArr[0]){
            $.msg('【京东账号一】移除购物车失败', '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {
                "open-url": "https://bean.m.jd.com/bean/signIndex.action"
            });
        }
        for(let i = 0; i < cookiesArr.length; i++){
            if(cookiesArr[i]){
                cookie = cookiesArr[i];
                $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
                $.index = i + 1;
                $.isLogin = true;
                $.nickName = '';
                await TotalBean();
                console.log(`****开始【京东账号${$.index}】${$.nickName || $.UserName}*****`);
                if(!$.isLogin){
                    $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {
                        "open-url": "https://bean.m.jd.com/bean/signIndex.action"
                    });
                    if($.isNode()){
                        await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                    }
                    continue
                }
                await requireConfig();
                do {
                    await getCart_xh();
                    $.keywordsNum = 0
                    if($.beforeRemove !== "0"){
                        await cartFilter_xh(venderCart);
                        if(parseInt($.beforeRemove) !== $.keywordsNum) await removeCart();
                        else {
                            console.log('由于购物车内的商品均包含关键字，本次执行将不删除购物车数据')
                            break;
                        }
                    } else break;
                } while(isRemoveAll && $.keywordsNum !== $.beforeRemove)
            }
        }
    } else {
        console.log("你设置了不删除购物车数据，要删除请设置环境变量 JD_CART 为 true")
    }
})().catch((e) => {
    $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
}).finally(() => {
    $.done();
})

function getCart_xh(){
    console.log('正在获取购物车数据...')
    return new Promise((resolve) => {
        const option = {
            url: 'https://p.m.jd.com/cart/cart.action?fromnav=1&sceneval=2',
            headers: {
                "Cookie": cookie,
                "User-Agent": "jdapp;JD4iPhone/167724 (iPhone; iOS 15.0; Scale/3.00)",
            },
        }
        $.get(option, async(err, resp, data) => {
            try{
                let content = getSubstr(data, "window.cartData = ", "window._PFM_TIMING").replace(/\s*/g,"");
                data = JSON.parse(content);
                $.areaId = data.areaId;   // locationId的传值
                $.traceId = data.traceId; // traceid的传值
                venderCart = data.cart.venderCart;
                postBody = 'pingouchannel=0&commlist=';
                $.beforeRemove = data.cartJson.num
                console.log(`获取到购物车数据 ${$.beforeRemove} 条`)
            } catch(e){
                $.logErr(e, resp);
            } finally{
                resolve(data);
            }
        });
    })
}

function cartFilter_xh(cartData){
    console.log("正在整理数据...")
    let pid;
    $.pushed = 0
    for(let cartJson of cartData){
        if($.pushed === removeSize) break;
        for(let sortedItem of cartJson.sortedItems){
            if($.pushed === removeSize) break;
            pid = typeof (sortedItem.polyItem.promotion) !== "undefined" ? sortedItem.polyItem.promotion.pid : ""
            for(let product of sortedItem.polyItem.products){
                if($.pushed === removeSize) break;
                let mainSkuName = product.mainSku.name
                $.isKeyword = false
                $.isPush = true
                for(let keyword of $.keywords){
                    if(mainSkuName.indexOf(keyword) !== -1){
                        $.keywordsNum += 1
                        $.isPush = false
                        $.keyword = keyword;
                        break;
                    } else $.isPush = true
                }
                if($.isPush){
                    let skuUuid = product.skuUuid;
                    let mainSkuId = product.mainSku.id
                    if(pid === "") postBody += `${mainSkuId},,1,${mainSkuId},1,,0,skuUuid:${skuUuid}@@useUuid:0$`
                    else postBody += `${mainSkuId},,1,${mainSkuId},11,${pid},0,skuUuid:${skuUuid}@@useUuid:0$`
                    $.pushed += 1;
                } else {
                    console.log(`\n${mainSkuName}`)
                    console.log(`商品已被过滤，原因：包含关键字 ${$.keyword}`)
                    $.isKeyword = true
                }
            }
        }
    }
    postBody += `&type=0&checked=0&locationid=${$.areaId}&templete=1&reg=1&scene=0&version=20190418&traceid=${$.traceId}&tabMenuType=1&sceneval=2`
}

function removeCart(){
    console.log('正在删除购物车数据...')
    return new Promise((resolve) => {
        const option = {
            url: 'https://wq.jd.com/deal/mshopcart/rmvCmdy?sceneval=2&g_login_type=1&g_ty=ajax',
            body: postBody,
            headers: {
                "Cookie": cookie,
                "User-Agent": "jdapp;JD4iPhone/167724 (iPhone; iOS 15.0; Scale/3.00)",
                "referer": "https://p.m.jd.com/",
                "origin": "https://p.m.jd.com/"
            },
        }
        $.post(option, async(err, resp, data) => {
            try{
                data = JSON.parse(data);
                $.afterRemove = data.cartJson.num
                if($.afterRemove < $.beforeRemove){
                    console.log(`删除成功，当前购物车剩余数据 ${$.afterRemove} 条\n`)
                    $.beforeRemove = $.afterRemove
                } else {
                    console.log('删除失败')
                    console.log(data.errMsg)
                    isRemoveAll = false;
                }
            } catch(e){
                $.logErr(e, resp);
            } finally{
                resolve(data);
            }
        });
    })
}

function getSubstr(str, leftStr, rightStr){
    let left = str.indexOf(leftStr);
    let right = str.indexOf(rightStr, left);
    if(left < 0 || right < left) return '';
    return str.substring(left + leftStr.length, right);
}

function TotalBean(){
    return new Promise(async resolve => {
        const options = {
            "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
            "headers": {
                "Accept": "application/json,text/plain, */*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-cn",
                "Connection": "keep-alive",
                "Cookie": cookie,
                "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
            }
        }
        $.post(options, (err, resp, data) => {
            try{
                if(err){
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if(data){
                        data = JSON.parse(data);
                        if(data['retcode'] === 13){
                            $.isLogin = false; //cookie过期
                            return
                        }
                        if(data['retcode'] === 0){
                            $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
                        } else {
                            $.nickName = $.UserName
                        }
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch(e){
                $.logErr(e, resp)
            } finally{
                resolve();
            }
        })
    })
}

function requireConfig(){
    return new Promise(resolve => {
        if($.isNode() && process.env.JD_CART){
            if(process.env.JD_CART_KEYWORDS){
                $.keywords = process.env.JD_CART_KEYWORDS.split('@')
            }
        }
        resolve()
    })
}

function jsonParse(str){
    if(typeof str == "string"){
        try{
            return JSON.parse(str);
        } catch(e){
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}

// prettier-ignore
function Env(t, e){
    "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0);

    class s{
        constructor(t){
            this.env = t
        }

        send(t, e = "GET"){
            t = "string" == typeof t ? {
                url: t
            } : t;
            let s = this.get;
            return "POST" === e && (s = this.post), new Promise((e, i) => {
                s.call(this, t, (t, s, r) => {
                    t ? i(t) : e(s)
                })
            })
        }

        get(t){
            return this.send.call(this.env, t)
        }

        post(t){
            return this.send.call(this.env, t, "POST")
        }
    }

    return new class{
        constructor(t, e){
            this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`)
        }

        isNode(){
            return "undefined" != typeof module && !!module.exports
        }

        isQuanX(){
            return "undefined" != typeof $task
        }

        isSurge(){
            return "undefined" != typeof $httpClient && "undefined" == typeof $loon
        }

        isLoon(){
            return "undefined" != typeof $loon
        }

        toObj(t, e = null){
            try{
                return JSON.parse(t)
            } catch{
                return e
            }
        }

        toStr(t, e = null){
            try{
                return JSON.stringify(t)
            } catch{
                return e
            }
        }

        getjson(t, e){
            let s = e;
            const i = this.getdata(t);
            if(i) try{
                s = JSON.parse(this.getdata(t))
            } catch{}
            return s
        }

        setjson(t, e){
            try{
                return this.setdata(JSON.stringify(t), e)
            } catch{
                return !1
            }
        }

        getScript(t){
            return new Promise(e => {
                this.get({
                    url: t
                }, (t, s, i) => e(i))
            })
        }

        runScript(t, e){
            return new Promise(s => {
                let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
                i = i ? i.replace(/\n/g, "").trim() : i;
                let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
                r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r;
                const [o, h] = i.split("@"), n = {
                    url: `http://${h}/v1/scripting/evaluate`,
                    body: {
                        script_text: t,
                        mock_type: "cron",
                        timeout: r
                    },
                    headers: {
                        "X-Key": o,
                        Accept: "*/*"
                    }
                };
                this.post(n, (t, e, i) => s(i))
            }).catch(t => this.logErr(t))
        }

        loaddata(){
            if(!this.isNode()) return {};
            {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile),
                    e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t),
                    i = !s && this.fs.existsSync(e);
                if(!s && !i) return {};
                {
                    const i = s ? t : e;
                    try{
                        return JSON.parse(this.fs.readFileSync(i))
                    } catch(t){
                        return {}
                    }
                }
            }
        }

        writedata(){
            if(this.isNode()){
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile),
                    e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t),
                    i = !s && this.fs.existsSync(e),
                    r = JSON.stringify(this.data);
                s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
            }
        }

        lodash_get(t, e, s){
            const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
            let r = t;
            for(const t of i)
                if(r = Object(r)[t], void 0 === r) return s;
            return r
        }

        lodash_set(t, e, s){
            return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
        }

        getdata(t){
            let e = this.getval(t);
            if(/^@/.test(t)){
                const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : "";
                if(r) try{
                    const t = JSON.parse(r);
                    e = t ? this.lodash_get(t, i, "") : e
                } catch(t){
                    e = ""
                }
            }
            return e
        }

        setdata(t, e){
            let s = !1;
            if(/^@/.test(e)){
                const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i),
                    h = i ? "null" === o ? null : o || "{}" : "{}";
                try{
                    const e = JSON.parse(h);
                    this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i)
                } catch(e){
                    const o = {};
                    this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i)
                }
            } else s = this.setval(t, e);
            return s
        }

        getval(t){
            return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
        }

        setval(t, e){
            return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
        }

        initGotEnv(t){
            this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
        }

        get(t, e = (() => {})){
            t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
                "X-Surge-Skip-Scripting": !1
            })), $httpClient.get(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                hints: !1
            })), $task.fetch(t).then(t => {
                const {
                    statusCode: s,
                    statusCode: i,
                    headers: r,
                    body: o
                } = t;
                e(null, {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o
                }, o)
            }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => {
                try{
                    if(t.headers["set-cookie"]){
                        const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                        s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar
                    }
                } catch(t){
                    this.logErr(t)
                }
            }).then(t => {
                const {
                    statusCode: s,
                    statusCode: i,
                    headers: r,
                    body: o
                } = t;
                e(null, {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o
                }, o)
            }, t => {
                const {
                    message: s,
                    response: i
                } = t;
                e(s, i, i && i.body)
            }))
        }

        post(t, e = (() => {})){
            if(t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
                "X-Surge-Skip-Scripting": !1
            })), $httpClient.post(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            });
            else if(this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                hints: !1
            })), $task.fetch(t).then(t => {
                const {
                    statusCode: s,
                    statusCode: i,
                    headers: r,
                    body: o
                } = t;
                e(null, {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o
                }, o)
            }, t => e(t));
            else if(this.isNode()){
                this.initGotEnv(t);
                const {
                    url: s,
                    ...i
                } = t;
                this.got.post(s, i).then(t => {
                    const {
                        statusCode: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    } = t;
                    e(null, {
                        status: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    }, o)
                }, t => {
                    const {
                        message: s,
                        response: i
                    } = t;
                    e(s, i, i && i.body)
                })
            }
        }

        time(t, e = null){
            const s = e ? new Date(e) : new Date;
            let i = {
                "M+": s.getMonth() + 1,
                "d+": s.getDate(),
                "H+": s.getHours(),
                "m+": s.getMinutes(),
                "s+": s.getSeconds(),
                "q+": Math.floor((s.getMonth() + 3) / 3),
                S: s.getMilliseconds()
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length)));
            for(let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)));
            return t
        }

        msg(e = t, s = "", i = "", r){
            const o = t => {
                if(!t) return t;
                if("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? {
                    "open-url": t
                } : this.isSurge() ? {
                    url: t
                } : void 0;
                if("object" == typeof t){
                    if(this.isLoon()){
                        let e = t.openUrl || t.url || t["open-url"],
                            s = t.mediaUrl || t["media-url"];
                        return {
                            openUrl: e,
                            mediaUrl: s
                        }
                    }
                    if(this.isQuanX()){
                        let e = t["open-url"] || t.url || t.openUrl,
                            s = t["media-url"] || t.mediaUrl;
                        return {
                            "open-url": e,
                            "media-url": s
                        }
                    }
                    if(this.isSurge()){
                        let e = t.url || t.openUrl || t["open-url"];
                        return {
                            url: e
                        }
                    }
                }
            };
            if(this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog){
                let t = ["", "==============📣系统通知📣=============="];
                t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t)
            }
        }

        log(...t){
            t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator))
        }

        logErr(t, e){
            const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t)
        }

        wait(t){
            return new Promise(e => setTimeout(e, t))
        }

        done(t = {}){
            const e = (new Date).getTime(),
                s = (e - this.startTime) / 1e3;
            this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
        }
    }(t, e)
}
