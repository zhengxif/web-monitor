// 静态资源监控
import Util from './util'

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
    }
    return o;
}
let resolveEntries = entries => entries.map( _ => resolvePerformanceResource(_));
export default {
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
            })
        } else {
            // 在onload之后获得所有的资源信息
            Util.onload(() => {
                let entries = performance.getEntriesByType('resource');
                let entriesData = resolveEntries(entries);
                cb(entriesData);
            })
        }
        
    }
}