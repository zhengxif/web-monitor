// 性能监控

export default {
    init(cb){
        let isDOMReady = false;
        let isOnLoad = false;
        let cycleTime = 100;
        let Util = {
            addEventListener: function (name, callback, useCapture) {
                if (window.addEventListener) {
                  return window.addEventListener(name, callback, useCapture);
                } else if (window.attachEvent) {
                  return window.attachEvent('on' + name, callback);
                }
            },
            getPerfData(p) {
                let data = {
                    // 网络建连
                    pervPage: p.fetchStart - p.navigationStart, // 上一个页面的时间
                    redirect: p.redirectEnd - p.redirectStart, // 重定向时间
                    dns: p.domainLookupEnd - p.domainLookupStart, // dns查找时间
                    connect: p.connectEnd - p.connectStart, // tcp建连时间
                    network: p.connectEnd - p.navigationStart, // 网络总耗时

                    // 网络接收
                    send: p.responseStart - p.requestStart, // 前端从发送到接收的时间
                    receive: p.responseEnd - p.responseStart, // 接收数据用时
                    request: p.responseEnd - p.requestStart, // 请求页面的总耗时

                    // 前端渲染
                    dom: p.domComplete - p.domLoading, // dom解析时间
                    loadEvent: p.loadEventEnd - p.loadEventStart, // loadEvent时间
                    frontend: p.loadEventEnd - p.domLoading, // 前端总时间

                    // 关键阶段
                    load: p.loadEventEnd - p.navigationStart, // 页面完成加载的时间
                    domReady: p.domContentLoadedEventEnd - p.navigationStart, // dom准备时间
                    interactive: p.domInteractive - p.navigationStart, // 可以操作dom的时间，（如点击）
                    ttfb: p.responseStart - p.navigationStart, // 首字节时间
                }
                return data;
            },
            // DOM解析完成
            domready(cb) {
                if (isDOMReady === true) return; 
                let timer = null;
                let runCheck = () => {
                    if (performance.timing.domComplete) { // 解析已完成
                        clearTimeout(timer);
                        cb();
                        isDOMReady = true;
                    } else {
                        timer = setTimeout(runCheck, cycleTime);
                    }
                }
                if (document.readyState === 'interactive') {
                    cb();
                } else if (document.addEventListener) {
                    document.addEventListener('DOMContentLoaded', function() {
                        runCheck();
                    },false)
                } else if (document.attachEvent) {
                    document.attachEvent('onreadystatechange', function() {
                        runCheck();
                    })
                }
            },
            // 页面加载完成
            onload(cb) {
                if (isOnLoad === true) return; 
                let timer = null;
                let runCheck = () => {
                    if (performance.timing.loadEventEnd) { // 加载已完成
                        clearTimeout(timer);
                        cb();
                        isOnLoad = true;
                    } else {
                        timer = setTimeout(runCheck, cycleTime);
                    }
                }
                if (document.readyState === 'complete') {
                    cb();
                } 
                Util.addEventListener('load', function() {
                    runCheck();
                }, false)
            }
        }
        let performance = window.performance;
        Util.domready(() => {
            let perfData = Util.getPerfData(performance.timing);
            perfData.type = 'domready';
            cb(perfData);
        })
        Util.onload(() => {
            let perfData = Util.getPerfData(performance.timing);
            perfData.type = 'onload';
            cb(perfData);
        })
    }
}