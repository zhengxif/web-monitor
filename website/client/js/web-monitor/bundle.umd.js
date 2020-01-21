(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
}((function () { 'use strict';

    // 性能监控

    var perf = {
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
                    };
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
                    };
                    if (document.readyState === 'interactive') {
                        cb();
                    } else if (document.addEventListener) {
                        document.addEventListener('DOMContentLoaded', function() {
                            runCheck();
                        },false);
                    } else if (document.attachEvent) {
                        document.attachEvent('onreadystatechange', function() {
                            runCheck();
                        });
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
                    };
                    if (document.readyState === 'complete') {
                        cb();
                    } 
                    Util.addEventListener('load', function() {
                        runCheck();
                    }, false);
                }
            };
            let performance = window.performance;
            Util.domready(() => {
                let perfData = Util.getPerfData(performance.timing);
                perfData.type = 'domready';
                cb(perfData);
            });
            Util.onload(() => {
                let perfData = Util.getPerfData(performance.timing);
                perfData.type = 'onload';
                cb(perfData);
            });
        }
    };

    var Util = {
        onload(cb) {
            if (document.readyState === 'complete') {
                cb();
            }
            window.addEventListener('load', cb);
        }
    };

    // 静态资源监控

    let resolvePerformanceResource = (resourceData) => {
        let r = resourceData;
        let o = {
            initiatorType: r.initiatorType,
            name: r.name,
            duration: parseInt(r.duration),

            // 连接过程
            redirect: r.redirectEnd - r.redirectStart, // 重定向
            dns: r.domainLookupEnd - r.domainLookupStart, // dns查找
            connect: r.connectEnd - r.connectStart, // tcp建连
            network: r.connectEnd - r.startTime, // 网络总耗时

            // 接收时间
            send: r.responseStart - r.requestStart, // 发送开始到接收的总时长
            receive: r.responseEnd - r.responseStart, // 接收的总时长
            request: r.responseEnd - r.requestStart, // 接收的总耗时

            // 核心指标
            ttfb: r.responseStart - r.requestStart, // 首字节时间
        };
        return o;
    };
    let resolveEntries = entries => entries.map( _ => resolvePerformanceResource(_));
    var resource = {
        init(cb) {
            if (window.PerformanceObserver) {
                // 动态获得每一个资源信息
                let observer = new window.PerformanceObserver(list => {
                    try {
                        let entries = list.getEntries();
                        let entriesData = resolveEntries(entries);
                        cb(entriesData);
                    } catch (error) {
                        console.log(error);
                    }
                });
                observer.observe({
                    entryTypes: ['resource'],
                });
            } else {
                // 在onload之后获得所有的资源信息
                Util.onload(() => {
                    let entries = performance.getEntriesByType('resource');
                    let entriesData = resolveEntries(entries);
                    cb(entriesData);
                });
            }
            
        }
    };

    // 请求监控
    var xhrHook = {
        init(cb) {
            let xhr = window.XMLHttpRequest;
            if (xhr._web_monitor_flag === true) return;
            xhr._web_monitor_flag = true;
            let _originOpen = xhr.prototype.open;
            xhr.prototype.open = function(method, url, async, user, password) {
                this._web_xhr_info = {
                    url, method, status: null,
                };
                return _originOpen.apply(this, arguments);
            };

            let _originSend = xhr.prototype.send;
            xhr.prototype.send = function(value) {
                this._web_start_time = Date.now();
                let _self = this;
                let ajaxEnd = (eventType) => () => {
                    if (_self.response) {
                        let responseSize = null;
                        switch(_self.responseType) {
                            case 'json':
                              responseSize = JSON && JSON.stringify(_this.response).length;
                              break;
                            case 'blob':
                            case 'moz-blob':
                              responseSize = _self.response.size;
                              break;
                            case 'arraybuffer':
                              responseSize = _self.response.byteLength;
                            case 'document':
                              responseSize = _self.response.documentElement && _self.response.documentElement.innerHTML && (_self.response.documentElement.innerHTML.length + 28);
                              break;
                            default:
                              responseSize = _self.response.length;
                        }
                        _self._web_xhr_info.event = eventType;
                        _self._web_xhr_info.status = _self.status;
                        _self._web_xhr_info.success = (_self.status >= 200 && _self.status <= 206) || _self.status === 304;
                        _self._web_xhr_info.duration = Date.now() - _self._web_start_time;
                        _self._web_xhr_info.responseSize = responseSize;
                        _self._web_xhr_info.requestSize = value ? value.length : 0;
                        _self._web_xhr_info.type = 'xhr';
                        cb(this._web_xhr_info);
                    }
                };
                // 这三种状态都代表这请求已经结束了 需要统计一些信息 并上报
                this.addEventListener('load', ajaxEnd('load'), false);
                this.addEventListener('error', ajaxEnd('error'),false);
                this.addEventListener('abort', ajaxEnd('abort'),false);

                return _originSend.apply(this, arguments);
            };

            // fetch hook
            if (window.fetch) {
                let _origin_fetch = window.fetch;
                window.fetch = function () {
                    let startTime = Date.now();
                    let args = [].slice.call(arguments);
        
                    let fetchInput = args[0];
                    let method = 'GET';
                    let url = null;
        
                    if (typeof fetchInput === 'string') {
                        url = fetchInput;
                    } else if ('Request' in window && fetchInput instanceof window.Request) {
                        url = fetchInput.url;
                        if (fetchInput.method) {
                            method = fetchInput.method;
                        }
                    } else {
                        url = '' + fetchInput;
                    }
                    if (args[1] && args[1].method) {
                        method = args[1].method;
                    }
        
                    // 要上报的数据
                    let webFetchData = {
                        method: method,
                        url: url,
                        status: null,
                    };
                    return _origin_fetch.apply(this, args).then(function(response) {
                        webFetchData.status = response.status;
                        webFetchData.type = 'fetch';
                        webFetchData.duration = Date.now() - startTime;
                        cb(webFetchData);
                        return response;
                    });
                };
            }

        }
    };

    let formatError = (errObj) => {
        let col = errObj.column || errObj.columnNumber; // Safari Firefox
        let row = errObj.line || errObj.lineNumber; // Safari Firefox
        let message = errObj.message;
        let name = errObj.name;
      
        let {stack} = errObj;
        if (stack) {
          let matchUrl = stack.match(/https?:\/\/[^\n]+/);
          let urlFirstStack = matchUrl ? matchUrl[0] : '';
          let regUrlCheck = /https?:\/\/(\S)*\.js/;
      
          let resourceUrl = '';
          if (regUrlCheck.test(urlFirstStack)) {
            resourceUrl = urlFirstStack.match(regUrlCheck)[0];
          }
      
          let stackCol = null;
          let stackRow = null;
          let posStack = urlFirstStack.match(/:(\d+):(\d+)/);
          if (posStack && posStack.length >= 3) {
            [, stackCol, stackRow] = posStack;
          }
      
          // TODO formatStack
          return {
            content: stack,
            col: Number(col || stackCol),
            row: Number(row || stackRow),
            message, name, resourceUrl
          };
        }
      
        return {
          row, col, message, name
        }
      };
      
      let errorCatch = {
        init: (cb) => {
          let _originOnerror = window.onerror;
          window.onerror = (...arg) => {
            let [errorMessage, scriptURI, lineNumber, columnNumber, errorObj] = arg;
            // console.log(arg, 'cuowu');
            let errorInfo = formatError(errorObj);
            errorInfo._errorMessage = errorMessage;
            errorInfo._scriptURI = scriptURI;
            errorInfo._lineNumber = lineNumber;
            errorInfo._columnNumber = columnNumber;
            errorInfo.type = 'onerror';
            cb(errorInfo);
            _originOnerror && _originOnerror.apply(window, arg);
          };
      
          let _originOnunhandledrejection = window.onunhandledrejection;
          window.onunhandledrejection = (...arg) => {
            let e = arg[0];
            let reason = e.reason;
            cb({
              type: e.type || 'unhandledrejection',
              reason
            });
            _originOnunhandledrejection && _originOnunhandledrejection.apply(window, arg);
          };
        },
      };

    perf.init((perfData) => {
        console.log(perfData);
    });

    resource.init((entriesData) => {
        console.log(entriesData);
    });

    xhrHook.init((xhrInfo) => {
        console.log(xhrInfo);
    });

    errorCatch.init((err) => {
        console.log('errorCatch', err);
    });

})));
