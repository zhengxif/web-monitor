// 请求监控
export default {
    init(cb) {
        let xhr = window.XMLHttpRequest;
        if (xhr._web_monitor_flag === true) return;
        xhr._web_monitor_flag = true;
        let _originOpen = xhr.prototype.open;
        xhr.prototype.open = function(method, url, async, user, password) {
            this._web_xhr_info = {
                url, method, status: null,
            }
            return _originOpen.apply(this, arguments);
        }

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
        }

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
                }
                return _origin_fetch.apply(this, args).then(function(response) {
                    webFetchData.status = response.status;
                    webFetchData.type = 'fetch';
                    webFetchData.duration = Date.now() - startTime;
                    cb(webFetchData);
                    return response;
                });
            }
        }

    }
}